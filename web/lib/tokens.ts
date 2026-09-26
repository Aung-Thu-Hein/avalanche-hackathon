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

import realSnapshot from "@/data/tokens.json";
import demoSnapshot from "@/data/tokens-demo.json";

// SAFEHOLD_DATASET=demo (set in web/.env.local) swaps in 40 generated demo
// tokens. Default is the real Tokenomist snapshot in data/tokens.json.
const snapshot = process.env.SAFEHOLD_DATASET === "demo" ? demoSnapshot : realSnapshot;
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
  return tokens.map((t) => scoreToken(t, now)).sort((a, b) => a.verdict.score - b.verdict.score);
}

export function findToken(query: string, now = Date.now()): ScoredToken | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const tokens = (snapshot.tokens as RawToken[]) ?? [];
  const hit =
    tokens.find((t) => t.symbol.toLowerCase() === q || t.id.toLowerCase() === q) ??
    tokens.find(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  return hit ? scoreToken(hit, now) : null;
}

export const snapshotMeta = {
  fetchedAt: snapshot.fetchedAt as string,
  source: snapshot.source as string,
  count: ((snapshot.tokens as RawToken[]) ?? []).length,
};

// ---------------------------------------------------------------- plan gating

/** Tokens every visitor can see in full. Everything else needs Pro. */
export const FREE_TOKEN_IDS = ["avalanche-2", "gunz", "doublezero", "lfj", "benqi", "arbitrum"];

/**
 * What the API returns for a token. For non-Pro callers, locked tokens keep
 * their identity (so the table can show the row) but lose every derived
 * number - the browser never receives data it could un-blur.
 */
export type PublicToken =
  | (ScoredToken & { locked: false })
  | (Pick<ScoredToken, "id" | "symbol" | "name" | "category" | "mock" | "marketCap"> & { locked: true });

export function toPublic(t: ScoredToken, isPro: boolean): PublicToken {
  if (isPro || FREE_TOKEN_IDS.includes(t.id)) return { ...t, locked: false };
  return { id: t.id, symbol: t.symbol, name: t.name, category: t.category, mock: t.mock, marketCap: t.marketCap, locked: true };
}
