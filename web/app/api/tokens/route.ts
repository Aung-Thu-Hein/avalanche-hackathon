import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { avalancheFuji } from "viem/chains";
import { allTokens, snapshotMeta, toPublic, FREE_TOKEN_IDS } from "@/lib/tokens";
import { safeHoldAbi, safeHoldAddress } from "@/lib/contract";

const client = createPublicClient({ chain: avalancheFuji, transport: http() });

/**
 * GET /api/tokens                -> every token; scores only for free tokens
 * GET /api/tokens?address=0x...  -> full scores if that address is Pro on-chain
 *
 * Gating happens here, server-side, so locked scores never reach the browser.
 * Residual risk: `address` proves nothing about who is asking - someone could
 * pass a known Pro address. Closing that needs Sign-In with Ethereum (a signed
 * message verified here). Acceptable for a demo; noted for production.
 */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");

  let isPro = false;
  if (address) {
    if (!isAddress(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    try {
      isPro = await client.readContract({
        address: safeHoldAddress,
        abi: safeHoldAbi,
        functionName: "isPro",
        args: [address],
      });
    } catch {
      // RPC hiccup: fail closed (treat as free) rather than leaking Pro data.
      isPro = false;
    }
  }

  // Soonest unlock first - the most urgent thing on the board.
  const tokens = allTokens()
    .sort((a, b) => (a.nextUnlock?.daysUntil ?? 9999) - (b.nextUnlock?.daysUntil ?? 9999))
    .map((t) => toPublic(t, isPro));

  return NextResponse.json({
    meta: { ...snapshotMeta, isPro, freeCount: FREE_TOKEN_IDS.length },
    tokens,
  });
}
