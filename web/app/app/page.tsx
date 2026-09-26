"use client";

import { Navbar } from "@/components/Navbar";
import { SafeHoldCard } from "@/components/SafeHoldCard";
import { safeHoldAddress } from "@/lib/contract";

export default function AppPage() {
  const unset = safeHoldAddress === "0x0000000000000000000000000000000000000000";

  return (
    <>
      <Navbar variant="app" />
      <main className="container app-main">
        {unset ? (
          <section className="card">
            <h2>Almost there</h2>
            <p className="muted">
              Put the deployed address in <code>web/.env.local</code> as{" "}
              <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> and restart the dev server.
            </p>
          </section>
        ) : (
          <SafeHoldCard />
        )}

        <p className="app-foot">
          Avalanche Fuji testnet ·{" "}
          <a href={`https://testnet.snowtrace.io/address/${safeHoldAddress}`} target="_blank" rel="noreferrer">
            View contract
          </a>{" "}
          · Unlock data from Tokenomist
        </p>
      </main>
    </>
  );
}
