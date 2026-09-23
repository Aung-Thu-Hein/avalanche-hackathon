"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { config } from "@/lib/wagmi";

/**
 * Three providers, always in this order: Wagmi -> ReactQuery -> RainbowKit.
 * wagmi v2 uses react-query under the hood for all caching, so the
 * QueryClientProvider is not optional.
 */
export function Providers({ children }: { children: ReactNode }) {
  // useState so the client is created once per browser session, not per render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
