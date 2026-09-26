"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEther } from "viem";
import gsap from "gsap";
import type { PublicToken } from "@/lib/tokens";
import { usePro } from "@/lib/usePro";
import { fmtDate, fmtPct, fmtUsd } from "@/lib/format";
import { Countdown } from "@/components/Visuals";
import { Robot } from "@/components/Robot";
import { Dropdown } from "@/components/Dropdown";

type Meta = { isPro: boolean; count: number; coverage: { freeCount: number } };
type SortKey = "soonest" | "risk" | "mcap";

// Stand-ins rendered under the blur. Deliberately fake - locked rows never
// receive real numbers from the API.
const FAKE = { score: "88", status: "Watch closely", unlock: "Oct 14 · 18d", size: "4.2%" };

export function TokenBoard() {
  const [tokens, setTokens] = useState<PublicToken[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<SortKey>("soonest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const pro = usePro(() => setRefresh((n) => n + 1));

  // ---- load (server decides what is unlocked for this address)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tokens?view=board${pro.address ? `&address=${pro.address}` : ""}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTokens(j.tokens);
        setMeta(j.meta);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message ?? "Could not load tokens"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pro.address, refresh]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(tokens.map((t) => t.category))).sort()], [tokens]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tokens.filter(
      (t) =>
        (cat === "All" || t.category === cat) &&
        (!q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)),
    );
    const lockedLast = (a: PublicToken, b: PublicToken) => Number(a.locked) - Number(b.locked);
    return [...list].sort((a, b) => {
      if (sort === "mcap") return (b.marketCap ?? 0) - (a.marketCap ?? 0);
      const l = lockedLast(a, b);
      if (l !== 0 || a.locked || b.locked) return l;
      if (sort === "risk") return a.verdict.score - b.verdict.score;
      return (a.nextUnlock?.daysUntil ?? 9999) - (b.nextUnlock?.daysUntil ?? 9999);
    });
  }, [tokens, query, cat, sort]);

  const lockedCount = tokens.filter((t) => t.locked).length;
  const soonCount = tokens.filter((t) => !t.locked && t.nextUnlock && t.nextUnlock.daysUntil <= 7).length;
  const selected = tokens.find((t) => t.id === selectedId) ?? null;
  // Soonest unlock the caller can actually see - the hero card.
  const featured =
    tokens
      .filter((t): t is Extract<PublicToken, { locked: false }> => !t.locked && t.nextUnlock !== null)
      .sort((a, b) => a.nextUnlock!.daysUntil - b.nextUnlock!.daysUntil)[0] ?? null;
  const firstLockedIndex = sort === "mcap" ? -1 : rows.findIndex((r) => r.locked);

  // ---- rows cascade in whenever the visible set changes
  useEffect(() => {
    if (!tableRef.current || loading) return;
    const els = tableRef.current.querySelectorAll(".tb-row, .tb-upsell");
    gsap.fromTo(els, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.018, ease: "power2.out" });
  }, [rows, loading]);

  // ---- hero entrance: title lines rise, copy fades, card floats in
  const heroPlayed = useRef(false);
  useEffect(() => {
    if (!heroRef.current || !meta || heroPlayed.current) return;
    heroPlayed.current = true;
    const q = gsap.utils.selector(heroRef);
    gsap.from(q(".bh-line > span"), { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.08 });
    gsap.from(q(".bh-fade"), { autoAlpha: 0, y: 18, duration: 0.8, delay: 0.25, stagger: 0.1, ease: "power3.out" });
    gsap.from(q(".bh-card"), { autoAlpha: 0, y: 30, scale: 0.97, duration: 0.9, delay: 0.3, ease: "power3.out" });
    const n = q("[data-count]")[0] as HTMLElement | undefined;
    if (n) {
      const c = { v: 0 };
      const target = Number(n.dataset.count);
      gsap.to(c, { v: target, duration: 1.4, delay: 0.4, ease: "power2.out", onUpdate: () => (n.textContent = String(Math.round(c.v))) });
    }
  }, [meta]);

  // ---- close drawer with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const priceLabel = pro.price !== undefined ? `${formatEther(pro.price)} AVAX` : "…";
  const proButton = (label = "Go Pro") => (
    <button className="g-btn g-btn-solid" onClick={pro.goPro} disabled={pro.price === undefined || pro.isPending || pro.isConfirming}>
      {pro.isPending ? "Confirm in wallet…" : pro.isConfirming ? "Confirming on Avalanche…" : label}
    </button>
  );

  return (
    <div className="board">
      {/* -------------------------------------------------------- summary */}
      <section className="board-hero" ref={heroRef}>
        <div className="bh-copy">
          <p className="g-mono bh-fade">Unlock radar · Live</p>
          <h1 className="board-title">
            <span className="bh-line"><span>Every token.</span></span>
            <span className="bh-line"><span className="grad">One safety score.</span></span>
          </h1>
          <p className="bh-sub bh-fade">
            Unlock risk for {meta?.count ?? "every"} tokens, scored 0–100 from a daily Tokenomist snapshot.
          </p>
          <div className="board-stats bh-fade">
            <div className="g-glass stat">
              <span>Tracked</span>
              <strong data-count={meta?.count ?? 0}>{meta?.count ?? "—"}</strong>
            </div>
            <div className="g-glass stat">
              <span>Unlocking ≤ 7 days</span>
              <strong>{meta ? (meta.isPro ? soonCount : `${soonCount}+`) : "—"}</strong>
            </div>
            <div className={`g-glass stat ${pro.isPro ? "stat-pro" : ""}`}>
              <span>Your plan</span>
              <strong>{pro.isPro ? `Pro · ${pro.daysLeft ?? 30}d` : "Free"}</strong>
            </div>
          </div>
        </div>

        {featured && !featured.locked && featured.nextUnlock && (
          <button
            className={`g-glass bh-card band-${featured.verdict.band}`}
            onClick={() => setSelectedId(featured.id)}
          >
            <div className="bh-card-top">
              <div>
                <p className="g-mono">Next unlock</p>
                <p className="bh-card-sym">
                  {featured.symbol} <span>{featured.name}</span>
                </p>
                <p className="status-pill">{featured.verdict.headline}</p>
              </div>
              <Robot className="bh-robot">
                <span className="robot-num">{featured.verdict.score}</span>
              </Robot>
            </div>
            <Countdown to={featured.nextUnlock.date} />
            <p className="bh-card-foot">
              {fmtPct(featured.nextUnlock.pctOfCirculatingBps / 100)} of circulating supply ·{" "}
              {fmtDate(featured.nextUnlock.date)}
            </p>
          </button>
        )}
      </section>

      {/* ------------------------------------------------------- controls */}
      <section className="g-glass controls">
        <input
          className="g-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${meta?.count ?? ""} tokens by name or symbol`}
          aria-label="Search tokens"
        />
        {categories.length > 2 && (
        <div className="chips" role="tablist" aria-label="Category">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? "chip chip-on" : "chip"} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        )}
        <Dropdown<SortKey>
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "soonest", label: "Soonest unlock" },
            { value: "risk", label: "Highest risk" },
            { value: "mcap", label: "Market cap" },
          ]}
        />
      </section>

      {/* ---------------------------------------------------------- table */}
      <section className="g-glass tb" ref={tableRef}>
        <div className="tb-head">
          <span>Token</span>
          <span>Score</span>
          <span>Status</span>
          <span>Next unlock</span>
          <span>Size</span>
          <span>Market cap</span>
        </div>

        {loading && tokens.length === 0 && <p className="tb-empty">Loading tokens…</p>}
        {error && <p className="tb-empty err">{error}</p>}
        {!loading && rows.length === 0 && <p className="tb-empty">No tokens match.</p>}

        {rows.map((t, i) => (
          <div key={t.id} className="tb-group">
            {i === firstLockedIndex && !meta?.isPro && (
              <div className="tb-upsell">
                <div>
                  <strong>{lockedCount} more tokens are scored for Pro members</strong>
                  <span>Scores, unlock dates and supply impact for every token — {priceLabel} / 30 days.</span>
                </div>
                {proButton()}
              </div>
            )}
            <button className={`tb-row ${t.locked ? "is-locked" : `band-${t.verdict.band}`}`} onClick={() => setSelectedId(t.id)}>
              <span className="c-token">
                <span className="avatar">{t.symbol.slice(0, 3)}</span>
                <span className="c-name">
                  <strong>{t.symbol}</strong>
                  <small>{t.name}</small>
                </span>
                {t.category !== "Other" && <span className="tag">{t.category}</span>}
              </span>
              <span className="c-score">
                {t.locked ? <Blur>{FAKE.score}</Blur> : <span className="score">{t.verdict.score}</span>}
              </span>
              <span className="c-status">
                {t.locked ? <Blur>{FAKE.status}</Blur> : <span className="status-pill">{t.verdict.headline}</span>}
              </span>
              <span className="c-unlock">
                {t.locked ? (
                  <Blur>{FAKE.unlock}</Blur>
                ) : t.nextUnlock ? (
                  `${fmtDate(t.nextUnlock.date, false)} · ${t.nextUnlock.daysUntil}d`
                ) : (
                  "None"
                )}
              </span>
              <span className="c-size">
                {t.locked ? <Blur>{FAKE.size}</Blur> : t.nextUnlock ? fmtPct(t.nextUnlock.pctOfCirculatingBps / 100) : "—"}
              </span>
              <span className="c-mcap">{fmtUsd(t.marketCap)}</span>
              {t.locked && <span className="lock">PRO</span>}
            </button>
          </div>
        ))}
      </section>

      <p className="board-foot">
        Unlock data from a cached Tokenomist snapshot. Scores update daily.
      </p>

      {/* --------------------------------------------------------- drawer */}
      <div className={`drawer-scrim ${selected ? "open" : ""}`} onClick={() => setSelectedId(null)} aria-hidden />
      <aside className={`drawer g-glass ${selected ? "open" : ""}`} aria-hidden={!selected} aria-label="Token detail">
        {selected && (
          <Detail
            key={selected.id}
            t={selected}
            onClose={() => setSelectedId(null)}
            priceLabel={priceLabel}
            proButton={proButton}
            pro={pro}
          />
        )}
      </aside>
    </div>
  );
}

function Blur({ children }: { children: React.ReactNode }) {
  return (
    <span className="blur" aria-label="Locked - Pro only">
      {children}
    </span>
  );
}

function Detail({
  t,
  onClose,
  priceLabel,
  proButton,
  pro,
}: {
  t: PublicToken;
  onClose: () => void;
  priceLabel: string;
  proButton: (label?: string) => React.ReactNode;
  pro: ReturnType<typeof usePro>;
}) {
  const band = t.locked ? "locked" : t.verdict.band;
  const maxPct = t.locked ? 1 : Math.max(1, ...t.upcoming.map((u) => u.pctOfCirculatingBps));

  return (
    <div className={`detail band-${band}`}>
      <div className="detail-head">
        <div>
          <p className="g-mono">
            {t.category}
            {t.mock && <span className="demo">Demo data</span>}
          </p>
          <h2>
            {t.symbol} <span>{t.name}</span>
          </h2>
        </div>
        <button className="g-btn g-btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <Robot className="detail-robot">
        <span className="robot-num">{t.locked ? "PRO" : t.verdict.score}</span>
      </Robot>

      {t.locked ? (
        <div className="detail-locked">
          <div className="detail-blurred" aria-hidden>
            <p className="detail-headline">Watch closely</p>
            <p>4.2% of circulating supply unlocks in 18 days.</p>
            <div className="facts">
              <div><span>Next unlock</span><strong>Oct 14, 2026</strong></div>
              <div><span>Size</span><strong>4.2% of supply</strong></div>
            </div>
          </div>
          <div className="lock-card">
            <strong>See the full score for {t.symbol}</strong>
            <span>Pro unlocks every score, unlock date and alert. {priceLabel} for 30 days, no auto-renew.</span>
            {proButton(`Unlock with Pro`)}
            {pro.error && <span className="err">{pro.error}</span>}
          </div>
        </div>
      ) : (
        <div className="detail-body">
          <p className="detail-headline">{t.verdict.headline}</p>
          <p className="muted">{t.verdict.detail}</p>

          <div className="facts">
            <div>
              <span>Next unlock</span>
              <strong>{t.nextUnlock ? fmtDate(t.nextUnlock.date) : "None"}</strong>
            </div>
            <div>
              <span>Size</span>
              <strong>{t.nextUnlock ? `${fmtPct(t.nextUnlock.pctOfCirculatingBps / 100)} of supply` : "—"}</strong>
            </div>
            <div>
              <span>Market cap</span>
              <strong>{fmtUsd(t.marketCap)}</strong>
            </div>
            <div>
              <span>Still locked</span>
              <strong>{t.lockedPctOfMaxBps !== null ? fmtPct(t.lockedPctOfMaxBps / 100) : "—"}</strong>
            </div>
          </div>

          {t.nextUnlock && (
            <div className="detail-block">
              <p className="g-mono">Time until next unlock</p>
              <Countdown to={t.nextUnlock.date} />
            </div>
          )}

          {t.upcoming.length > 0 && (
            <div className="detail-block">
              <p className="g-mono">Upcoming unlocks</p>
              <ul className="timeline">
                {t.upcoming.map((u) => (
                  <li key={u.date}>
                    <span className="tl-date">{fmtDate(u.date, false)}</span>
                    <span className="tl-bar">
                      <span style={{ width: `${Math.max(4, (u.pctOfCirculatingBps / maxPct) * 100)}%` }} />
                    </span>
                    <span className="tl-pct">{fmtPct(u.pctOfCirculatingBps / 100)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!pro.isPro && (
            <div className="lock-card lock-card-soft">
              <strong>Get alerted before this unlock</strong>
              <span>Pro members get a heads-up before every unlock on their watchlist. {priceLabel} / 30 days.</span>
              {proButton()}
            </div>
          )}
          {pro.isPro && <p className="ok">Pro is active · alerts on for {t.symbol}.</p>}
        </div>
      )}

      {pro.isSuccess && pro.hash && (
        <p className="ok small">
          Subscription confirmed ·{" "}
          <a href={`https://testnet.snowtrace.io/tx/${pro.hash}`} target="_blank" rel="noreferrer">
            View on Snowtrace
          </a>
        </p>
      )}
    </div>
  );
}
