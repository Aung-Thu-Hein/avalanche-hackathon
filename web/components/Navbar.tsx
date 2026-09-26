"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar({ variant }: { variant: "home" | "app" }) {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="brand">SafeHold</Link>

        {variant === "home" && (
          <nav className="navlinks">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </nav>
        )}

        {variant === "home" ? (
          <Link href="/app" className="btn btn-primary btn-sm">Launch App</Link>
        ) : (
          <ConnectButton label="Connect wallet" showBalance={false} chainStatus="none" accountStatus="address" />
        )}
      </div>
    </header>
  );
}
