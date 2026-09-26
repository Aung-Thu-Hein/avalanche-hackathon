"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar({ variant }: { variant: "home" | "app" }) {
  return (
    <header className="nav">
      <Link href="/" className="nav-cell brand">SafeHold</Link>

      {variant === "home" ? (
        <nav className="nav-links">
          <a href="#story" className="nav-cell">Score</a>
          <a href="#how" className="nav-cell">How it works</a>
          <a href="#pricing" className="nav-cell">Pricing</a>
        </nav>
      ) : (
        <nav className="nav-links">
          <Link href="/" className="nav-cell">Home</Link>
          <span className="nav-cell nav-here">Radar</span>
        </nav>
      )}

      <div className="nav-cell nav-end">
        {variant === "home" ? (
          <Link href="/app" className="g-btn g-btn-outline">Launch app</Link>
        ) : (
          <ConnectButton label="Connect" showBalance={false} chainStatus="none" accountStatus="address" />
        )}
      </div>
    </header>
  );
}
