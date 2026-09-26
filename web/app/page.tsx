"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SafeHoldCard } from "@/components/SafeHoldCard";
import { safeHoldAddress } from "@/lib/contract";

export default function Home() {
  const unset = safeHoldAddress === "0x0000000000000000000000000000000000000000";

  return (
    <main>
      <header>
        <div>
          <h1>SafeHold</h1>
          <p className="tagline">Know before you hold.</p>
        </div>
        <ConnectButton />
      </header>

      {unset ? (
        <section className="card">
          <h2>Almost there</h2>
          <p>
            Put the deployed address in <code>web/.env.local</code> as{" "}
            <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> and restart the dev server.
          </p>
        </section>
      ) : (
        <SafeHoldCard />
      )}

      <footer>
        Avalanche Fuji (43113) &middot;{" "}
        <a
          href={`https://testnet.snowtrace.io/address/${safeHoldAddress}`}
          target="_blank"
          rel="noreferrer"
        >
          contract
        </a>{" "}
        &middot; unlock data from Tokenomist
      </footer>
    </main>
  );
}
