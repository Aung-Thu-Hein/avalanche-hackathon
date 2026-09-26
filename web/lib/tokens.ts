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

import snapshot from "@/data/tokens.json";
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
  unlocks: Unlock[];
};

export type ScoredToken = {
  id: string;
  symbol: string;
  name: string;
  marketCap: number | null;
  circulatingSupply: number;
  lockedPctOfMaxBps: number | null;
  nextUnlock: (Unlock & { daysUntil: number }) | null;
  verdict: Verdict;
};

const DAY_MS = 86_400_000;

function daysUntil(iso: string, now: number): number {
  return Math.floor((Date.parse(iso) - now) / DAY_MS);
}

function nextUnlock(t: RawToken, now: number) {
  const future = t.unlocks
    .map((u) => ({ ...u, daysUntil: daysUntil(u.date, now) }))
    .filter((u) => u.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return future[0] ?? null;
}

export function scoreToken(t: RawToken, now = Date.now()): ScoredToken {
  const next = nextUnlock(t, now);

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
    nextUnlock: next,
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
