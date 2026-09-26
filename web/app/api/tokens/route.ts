import { NextResponse } from "next/server";
import { allTokens, findToken, snapshotMeta } from "@/lib/tokens";

/**
 * GET /api/tokens        -> every token in the snapshot, riskiest first
 * GET /api/tokens?q=avax -> one token, or 404
 *
 * Runs server-side. This is also where a live Tokenomist call would go if the
 * snapshot were ever refreshed on demand — which is why the API key belongs in
 * TOKENOMIST_API_KEY (no NEXT_PUBLIC_ prefix) and never reaches the browser.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q");

  if (q) {
    const token = findToken(q);
    if (!token) {
      return NextResponse.json({ error: `No token matching "${q}"` }, { status: 404 });
    }
    return NextResponse.json({ meta: snapshotMeta, token });
  }

  return NextResponse.json({ meta: snapshotMeta, tokens: allTokens() });
}
