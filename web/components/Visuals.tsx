"use client";

import { useEffect, useState } from "react";

export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} aria-label={`Safety score ${score} out of 100`}>
      <svg viewBox="0 0 128 128" aria-hidden>
        <circle cx="64" cy="64" r={r} className="ring-track" />
        <circle
          cx="64"
          cy="64"
          r={r}
          className="ring-value"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
        />
      </svg>
      <span style={{ fontSize: size * 0.33 }}>{score}</span>
    </div>
  );
}

export function Countdown({ to }: { to: string }) {
  const target = Date.parse(to);
  const [now, setNow] = useState<number | null>(null);

  // Start ticking only on the client, so server and client HTML match.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? 0 : Math.max(0, target - now);
  const parts = [
    { v: Math.floor(left / 86_400_000), l: "days" },
    { v: Math.floor(left / 3_600_000) % 24, l: "hours" },
    { v: Math.floor(left / 60_000) % 60, l: "mins" },
    { v: Math.floor(left / 1000) % 60, l: "secs" },
  ];

  return (
    <div className="countdown">
      {parts.map((p) => (
        <div key={p.l} className="tile">
          <strong>{now === null ? "--" : String(p.v).padStart(2, "0")}</strong>
          <span>{p.l}</span>
        </div>
      ))}
    </div>
  );
}
