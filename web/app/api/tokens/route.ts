import { NextResponse } from "next/server";
import { isProAddress } from "@/lib/chain";
import {
  allTokens,
  boardTokens,
  coverage,
  freeTokens,
  lookup,
  snapshotMeta,
} from "@/lib/tokens";

/**
 * GET /api/tokens?q=avax&address=0x…
 *
 *   200  { token }               a score
 *   402  { locked: true, … }     tracked, but the caller is not Pro
 *   404  { untracked: true, … }  we know the token, we have no unlock data
 *   404  { error }               not a token we recognise
 *
 * GET /api/tokens?address=0x…    the list: 5 free symbols, or all 92 for Pro
 * GET /api/tokens?view=board&address=0x…
 *                                every token as a table row; locked rows carry
 *                                only name/symbol/market cap unless Pro
 *
 * The paywall is enforced here by reading `isPro()` from Avalanche — not from a
 * database. Gating in the browser would be bypassable in devtools; gating here
 * means the subscription that unlocks the data is the same one anyone can
 * verify on Snowtrace.
 *
 * Runs server-side, which is also why TOKENOMIST_API_KEY (no NEXT_PUBLIC_
 * prefix) never reaches the browser.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q");
  const address = params.get("address");

  const isPro = await isProAddress(address);
  const meta = { ...snapshotMeta, coverage, isPro };

  if (params.get("view") === "board") {
    return NextResponse.json({ meta, tokens: boardTokens(isPro) });
  }

  if (!q) {
    return NextResponse.json({
      meta,
      tokens: isPro ? allTokens() : freeTokens(),
    });
  }

  const result = lookup(q, isPro);

  switch (result.status) {
    case "found":
      return NextResponse.json({ meta, token: result.token });

    case "locked":
      // 402 Payment Required: the resource exists, it costs a subscription.
      return NextResponse.json(
        {
          meta,
          locked: true,
          symbol: result.symbol,
          name: result.name,
          message: `${result.symbol} is available on Pro. The free plan covers ${coverage.freeCount} tokens.`,
        },
        { status: 402 },
      );

    case "untracked":
      return NextResponse.json(
        {
          meta,
          untracked: true,
          symbol: result.symbol,
          name: result.name,
          message: `${result.symbol} is not tracked yet — we have no unlock schedule for it.`,
        },
        { status: 404 },
      );

    default:
      return NextResponse.json(
        { meta, error: `No token matching "${result.query}"` },
        { status: 404 },
      );
  }
}
