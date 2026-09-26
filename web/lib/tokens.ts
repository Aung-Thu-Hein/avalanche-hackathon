/**
 * Reads the cached Tokenomist snapshot and turns it into scored tokens.
 *
 * Server-side only. The snapshot is committed to the repo so the app never
 * depends on the live API during a demo, and so development burns no API
 * credits — the plan allows 1,000 calls a month and `unlock/events` costs one
 * per token.
 *
 * Days-until-unlock is computed here at request time, never baked into the
 * snapshot: unlock dates are near-static, only the countdown moves.
 */

import { FREE_SYMBOLS } from "@/lib/free";
import snapshot from "@/data/tokens.json";
import tokenIndex from "@/data/token-index.json";
import { verdict, type Verdict } from "@/lib/score";

export type Unlock = {
  date: string;
  amount: number;
  pctOfCirculatingBps: number;
};

export type RawToken = {
  id: string;
  symbol: string;
  name: string;
  marketCap: number | null;
  circulatingSupply: number;
  maxSupply: number | null;
  totalLockedAmount: number | null;
  websiteUrl?: string;
  category?: string;
  /** Generated demo token - not a real unlock schedule. */
  mock?: boolean;
  unlocks: Unlock[];
};

export type ScoredToken = {
  id: string;
  symbol: string;
  name: string;
  marketCap: number | null;
  circulatingSupply: number;
  lockedPctOfMaxBps: number | null;
  category: string;
  mock: boolean;
  nextUnlock: (Unlock & { daysUntil: number }) | null;
  /** The next few future unlocks, for the detail timeline. */
  upcoming: (Unlock & { daysUntil: number })[];
  verdict: Verdict;
};

const DAY_MS = 86_400_000;

function daysUntil(iso: string, now: number): number {
  return Math.floor((Date.parse(iso) - now) / DAY_MS);
}

function futureUnlocks(t: RawToken, now: number) {
  return t.unlocks
    .map((u) => ({ ...u, daysUntil: daysUntil(u.date, now) }))
    .filter((u) => u.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function scoreToken(t: RawToken, now = Date.now()): ScoredToken {
  const future = futureUnlocks(t, now);
  const next = future[0] ?? null;

  const v = verdict(
    {
      unlockPercentBps: next?.pctOfCirculatingBps ?? 0,
      // With no upcoming unlock, push the distance past the proximity window so
      // it contributes no penalty rather than defaulting to 0 days (maximum).
      daysUntilUnlock: next?.daysUntil ?? 9999,
    },
    { hasUpcomingUnlock: next !== null },
  );

  const locked = t.totalLockedAmount ?? 0;
  const max = t.maxSupply ?? 0;

  return {
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    marketCap: t.marketCap,
    circulatingSupply: t.circulatingSupply,
    lockedPctOfMaxBps: max > 0 ? Math.round((locked / max) * 10_000) : null,
    category: t.category ?? "Other",
    mock: Boolean(t.mock),
    nextUnlock: next,
    upcoming: future.slice(0, 6),
    verdict: v,
  };
}

export function allTokens(now = Date.now()): ScoredToken[] {
  const tokens = (snapshot.tokens as RawToken[]) ?? [];
  return tokens
    .map((t) => scoreToken(t, now))
    .sort((a, b) => a.verdict.score - b.verdict.score);
}

export function findToken(query: string, now = Date.now()): ScoredToken | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const tokens = (snapshot.tokens as RawToken[]) ?? [];
  // Exact matches only. A substring fallback made "SOL" resolve to "SOLV" -
  // showing one token's unlock risk under another token's name, which in a
  // product about risk is worse than returning nothing.
  const hit = tokens.find(
    (t) =>
      t.symbol.toLowerCase() === q ||
      t.id.toLowerCase() === q ||
      t.name.toLowerCase() === q,
  );
  return hit ? scoreToken(hit, now) : null;
}

export const snapshotMeta = {
  fetchedAt: snapshot.fetchedAt as string,
  source: snapshot.source as string,
  count: ((snapshot.tokens as RawToken[]) ?? []).length,
};

// ---------------------------------------------------------------------------
// Free tier
// ---------------------------------------------------------------------------

export { FREE_SYMBOLS } from "@/lib/free";

const FREE = new Set<string>(FREE_SYMBOLS.map((s) => s.toLowerCase()));

export function isFreeSymbol(symbol: string): boolean {
  return FREE.has(symbol.toLowerCase());
}

export function freeTokens(now = Date.now()): ScoredToken[] {
  return allTokens(now).filter((t) => isFreeSymbol(t.symbol));
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

type IndexEntry = { id: string; symbol: string; name: string };

/**
 * Four distinct outcomes, because collapsing them loses the information the UI
 * needs:
 *   found     - we have a score
 *   locked    - we have a score, but the caller is not Pro
 *   untracked - Tokenomist knows this token, we have no unlock schedule for it
 *   unknown   - not a token we have heard of
 *
 * "untracked" matters: returning a cheerful 82 for a token we have no data on
 * would be telling the user it is safe when we simply do not know.
 */
export type LookupResult =
  | { status: "found"; token: ScoredToken }
  | { status: "locked"; symbol: string; name: string }
  | { status: "untracked"; symbol: string; name: string }
  | { status: "unknown"; query: string };

function findIndexEntry(q: string): IndexEntry | null {
  const entries = (tokenIndex.tokens as IndexEntry[]) ?? [];
  return (
    entries.find(
      (t) => t.symbol.toLowerCase() === q || t.id.toLowerCase() === q,
    ) ??
    entries.find((t) => t.name.toLowerCase() === q) ??
    null
  );
}

export function lookup(
  query: string,
  isPro: boolean,
  now = Date.now(),
): LookupResult {
  const q = query.trim().toLowerCase();
  if (!q) return { status: "unknown", query };

  const scored = findToken(q, now);
  if (scored) {
    if (isPro || isFreeSymbol(scored.symbol))
      return { status: "found", token: scored };
    return { status: "locked", symbol: scored.symbol, name: scored.name };
  }

  const known = findIndexEntry(q);
  if (known)
    return { status: "untracked", symbol: known.symbol, name: known.name };

  return { status: "unknown", query };
}

export const coverage = {
  /** tokens we hold an unlock schedule for */
  tracked: ((snapshot.tokens as RawToken[]) ?? []).length,
  /** tokens Tokenomist knows about at all */
  known: (tokenIndex.count as number) ?? 0,
  freeCount: FREE_SYMBOLS.length,
};

// ---------------------------------------------------------------------------
// Board view (the full table)
// ---------------------------------------------------------------------------

/**
 * One table row. For non-Pro callers, locked tokens keep their identity (so the
 * row can render, blurred) but lose every derived number - the browser never
 * receives data it could un-blur.
 */
export type PublicToken =
  | (ScoredToken & { locked: false })
  | (Pick<ScoredToken, "id" | "symbol" | "name" | "category" | "mock" | "marketCap"> & { locked: true });

export function toPublic(t: ScoredToken, isPro: boolean): PublicToken {
  if (isPro || isFreeSymbol(t.symbol)) return { ...t, locked: false };
  return { id: t.id, symbol: t.symbol, name: t.name, category: t.category, mock: t.mock, marketCap: t.marketCap, locked: true };
}

/** Every tracked token, soonest unlock first, gated for this caller. */
export function boardTokens(isPro: boolean, now = Date.now()): PublicToken[] {
  return allTokens(now)
    .sort((a, b) => (a.nextUnlock?.daysUntil ?? 9999) - (b.nextUnlock?.daysUntil ?? 9999))
    .map((t) => toPublic(t, isPro));
}
