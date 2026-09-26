"use client";

import { Navbar } from "@/components/Navbar";
import { TokenBoard } from "@/components/TokenBoard";
import { safeHoldAddress } from "@/lib/contract";

export default function AppPage() {
  return (
    <>
      <div className="aurora" aria-hidden />
      <Navbar variant="app" />
      <main className="app-main">
        <TokenBoard />
        <p className="board-foot">
          Avalanche Fuji testnet ·{" "}
          <a href={`https://testnet.snowtrace.io/address/${safeHoldAddress}`} target="_blank" rel="noreferrer">
            View contract
          </a>
        </p>
      </main>
    </>
  );
}
