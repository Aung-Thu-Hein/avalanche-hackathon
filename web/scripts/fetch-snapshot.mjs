#!/usr/bin/env node
/**
 * Refresh data/tokens.json from the Tokenomist API.
 *
 *   npm run snapshot                          # default demo tokens
 *   npm run snapshot -- avalanche-2,gunz      # pick token ids (Tokenomist slugs)
 *   npm run snapshot -- --dry-run             # fetch + print, don't write
 *
 * Cost: 1 call (token/list, batched) + 1 call per token (unlock/events).
 * Only successful calls consume credit. The key is read from TOKENOMIST_API_KEY
 * (env or web/.env.local) and is never printed.
 */

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://api.tokenomist.ai";
const DEFAULT_IDS = ["avalanche-2", "gunz", "doublezero"];
const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(WEB_DIR, "data", "tokens.json");

/**
 * Turn Tokenomist responses into the shape lib/tokens.ts reads.
 * `get(path)` returns parsed JSON; injected so this can run against samples.
 */
export async function buildSnapshot(ids, get, today = new Date().toISOString().slice(0, 10)) {
  const list = await get(`/v5/token/list?tokenId=${ids.map(encodeURIComponent).join(",")}`);
  const byId = new Map((list.data ?? []).map((t) => [t.id, t]));

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) console.warn(`! not found on Tokenomist, skipped: ${missing.join(", ")}`);

  const tokens = [];
  for (const id of ids.filter((i) => byId.has(i))) {
    const t = byId.get(id);
    const events = await get(`/v5/unlock/events/${encodeURIComponent(id)}?start=${today}&pageSize=100`);

    // The cliff amount is nested under `cliffUnlocks`, not on the event itself:
    //   { unlockDate, tokenName, tokenSymbol, listedMethod, dataSource,
    //     cliffUnlocks: { cliffAmount, cliffValue, allocationBreakdown }, ... }
    // Reading e.cliffAmount gives undefined, which silently filtered out every
    // event and wrote an empty `unlocks` array for every token.
    const unlocks = (events.data ?? [])
      .map((e) => ({ date: e.unlockDate, amount: (e.cliffUnlocks ?? {}).cliffAmount ?? 0 }))
      .filter((u) => u.date && u.amount > 0)
      .map((u) => ({
        date: u.date,
        amount: u.amount,
        // % of *circulating* supply, in bps - what the score formula expects.
        pctOfCirculatingBps:
          t.circulatingSupply > 0 ? Math.round((u.amount / t.circulatingSupply) * 10_000) : 0,
      }))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    tokens.push({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      marketCap: t.marketCap ?? null,
      circulatingSupply: t.circulatingSupply,
      maxSupply: t.maxSupply ?? null,
      totalLockedAmount: t.totalLockedAmount ?? null,
      websiteUrl: t.websiteUrl,
      unlocks,
    });
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: "tokenomist.ai v5 (token/list + unlock/events)",
    tokens,
  };
}

function loadKey() {
  if (process.env.TOKENOMIST_API_KEY) return process.env.TOKENOMIST_API_KEY;
  try {
    const line = readFileSync(join(WEB_DIR, ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith("TOKENOMIST_API_KEY="));
    return line?.slice("TOKENOMIST_API_KEY=".length).trim().replace(/^["']|["']$/g, "") || null;
  } catch {
    return null;
  }
}

function makeGet(key) {
  let lastCredit = null;
  const get = async (path) => {
    const res = await fetch(BASE + path, { headers: { "x-api-key": key } });
    if (res.status === 401 || res.status === 403) throw new Error(`auth failed (${res.status}) - check TOKENOMIST_API_KEY`);
    if (res.status === 429) throw new Error("429 - rate limit or monthly credits used up");
    if (!res.ok) throw new Error(`${res.status} on ${path.split("?")[0]}`);
    const json = await res.json();
    if (json.metadata?.credit) lastCredit = json.metadata.credit;
    return json;
  };
  get.credit = () => lastCredit;
  return get;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const idArg = args.find((a) => !a.startsWith("--"));
  const ids = idArg ? idArg.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_IDS;

  const key = loadKey();
  if (!key) {
    console.error("TOKENOMIST_API_KEY not set. Add it to web/.env.local (no NEXT_PUBLIC_ prefix).");
    process.exit(1);
  }

  console.log(`Fetching ${ids.length} token(s): ${ids.join(", ")}  (~${ids.length + 1} credits)`);
  const get = makeGet(key);
  const snapshot = await buildSnapshot(ids, get);

  for (const t of snapshot.tokens) {
    const next = t.unlocks[0];
    console.log(
      `  ${t.symbol.padEnd(8)} ${t.unlocks.length} future unlock(s)` +
        (next ? ` · next ${next.date.slice(0, 10)} (${next.pctOfCirculatingBps / 100}% of circ.)` : ""),
    );
  }
  if (snapshot.tokens.length && snapshot.tokens.every((t) => t.unlocks.length === 0)) {
    console.warn("! No future unlocks returned for any token - your plan may only include past data.");
  }
  const credit = get.credit();
  if (credit) console.log(`Credits: ${credit.used}/${credit.limit}`);

  if (snapshot.tokens.length === 0) {
    console.error("Nothing fetched - data/tokens.json left unchanged.");
    process.exit(1);
  }
  if (dryRun) {
    console.log("--dry-run: data/tokens.json not written.");
    return;
  }

  // Write to a temp file then rename, so a crash never leaves a half-written snapshot.
  writeFileSync(OUT + ".tmp", JSON.stringify(snapshot, null, 2) + "\n");
  renameSync(OUT + ".tmp", OUT);
  console.log(`Wrote ${snapshot.tokens.length} token(s) to data/tokens.json`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`Snapshot failed: ${e.message}. data/tokens.json left unchanged.`);
    process.exit(1);
  });
}
