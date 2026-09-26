/**
 * Server-side chain reads.
 *
 * The Pro paywall is enforced here, by asking Avalanche whether an address has
 * an active subscription — not by consulting a database. That is the whole
 * point: the subscription lives on-chain, so anyone can verify it, and we
 * cannot quietly grant or revoke access.
 *
 * Honest limitation: this trusts the address the client claims. Anyone who
 * knows a Pro address could pass it. Proving ownership needs a signed message
 * (viem's `verifyMessage`) — the next step, deliberately not in this version.
 */

import { createPublicClient, http, isAddress, type Address } from "viem";
import { avalancheFuji } from "viem/chains";
import { safeHoldAbi, safeHoldAddress } from "@/lib/contract";

const client = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});

/** Cache chain reads briefly so a burst of searches is one RPC call, not ten. */
const TTL_MS = 15_000;
const cache = new Map<string, { value: boolean; at: number }>();

export async function isProAddress(address: string | null): Promise<boolean> {
  if (!address || !isAddress(address)) return false;

  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  try {
    const value = await client.readContract({
      address: safeHoldAddress,
      abi: safeHoldAbi,
      functionName: "isPro",
      args: [address as Address],
    });
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch {
    // An RPC hiccup must not silently grant Pro access.
    return false;
  }
}
