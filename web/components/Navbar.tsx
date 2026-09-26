"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar({ variant }: { variant: "home" | "app" }) {
  // Compact, more opaque bar once the page has scrolled.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <Link href="/" className="nav-cell brand">
        <span className="brand-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={30} height={30} />
        </span>
        SafeHold
      </Link>

      {variant === "home" ? (
        <nav className="nav-links">
          <a href="#story" className="nav-cell nav-link">Score</a>
          <a href="#how" className="nav-cell nav-link">How it works</a>
          <a href="#pricing" className="nav-cell nav-link">Pricing</a>
        </nav>
      ) : (
        <nav className="nav-links">
          <Link href="/" className="nav-cell nav-link">Home</Link>
          <span className="nav-cell nav-link nav-here">Radar</span>
        </nav>
      )}

      <div className="nav-cell nav-end">
        {variant === "home" ? (
          <Link href="/app" className="g-btn g-btn-outline nav-cta">Launch app</Link>
        ) : (
          <ConnectButton label="Connect" showBalance={false} chainStatus="none" accountStatus="address" />
        )}
      </div>
    </header>
  );
}
