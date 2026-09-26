// Plain helpers - no "use client", so both server pages and client components can call them.

export function fmtDate(iso: string, withYear = true) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function fmtPct(pct: number) {
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function fmtUsd(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
