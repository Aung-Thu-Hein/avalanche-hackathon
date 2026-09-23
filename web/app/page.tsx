"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { TipJarCard } from "@/components/TipJarCard";
import { tipJarAddress } from "@/lib/contract";

export default function Home() {
  const unset = tipJarAddress === "0x0000000000000000000000000000000000000000";

  return (
    <main>
      <header>
        <h1>TipJar</h1>
        <ConnectButton />
      </header>

      {unset ? (
        <section className="card">
          <h2>Almost there</h2>
          <p>
            Deploy the contract, then put its address in <code>web/.env.local</code> as{" "}
            <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> and restart the dev server.
          </p>
        </section>
      ) : (
        <TipJarCard />
      )}

      <footer>
        Avalanche Fuji (43113) &middot;{" "}
        <a href={`https://testnet.snowtrace.io/address/${tipJarAddress}`} target="_blank" rel="noreferrer">
          contract
        </a>
      </footer>
    </main>
  );
}
