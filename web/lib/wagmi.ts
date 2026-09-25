import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalancheFuji } from "wagmi/chains";

/**
 * avalancheFuji is built into wagmi - chainId 43113, RPC and Snowtrace explorer
 * already configured. You do not need to define the chain by hand.
 *
 * Swap to `avalanche` (mainnet) only if you know why you're doing it.
 */
export const config = getDefaultConfig({
  appName: "TipJar",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "",
  chains: [avalancheFuji],
  ssr: true, // required for the Next.js app router
});
