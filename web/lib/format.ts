// Plain helpers - no "use client", so both server pages and client components can call them.

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtPct(pct: number) {
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}
