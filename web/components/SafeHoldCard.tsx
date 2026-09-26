"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import { safeHoldAbi, safeHoldAddress } from "@/lib/contract";
import { Countdown, ScoreRing } from "@/components/Visuals";
import { fmtDate, fmtPct } from "@/lib/format";

type Verdict = {
  score: number;
  band: "safe" | "watch" | "risk";
  headline: string;
  detail: string;
};

type Token = {
  id: string;
  symbol: string;
  name: string;
  marketCap: number | null;
  nextUnlock: { date: string; daysUntil: number; pctOfCirculatingBps: number } | null;
  verdict: Verdict;
};

const DEMO_TOKENS = ["AVAX", "GUN", "2Z"];

export function SafeHoldCard() {
  const { address, isConnected } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState("AVAX");
  const [token, setToken] = useState<Token | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- score lookup (off-chain, from the cached snapshot) ---------------
  async function lookup(q: string) {
    setLoading(true);
    setLookupError(null);
    setActive(q.toUpperCase());
    try {
      const res = await fetch(`/api/tokens?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) {
        setLookupError(json.error ?? "Lookup failed");
      } else {
        setToken(json.token);
      }
    } catch {
      setLookupError("Could not reach the scoring API");
    } finally {
      setLoading(false);
    }
  }

  // Load the demo token on first paint so the card is never empty on stage.
  useEffect(() => {
    lookup("AVAX");
  }, []);

  // ---- on-chain reads ---------------------------------------------------
  const { data: price } = useReadContract({
    address: safeHoldAddress,
    abi: safeHoldAbi,
    functionName: "price",
  });

  const { data: isPro, refetch: refetchIsPro } = useReadContract({
    address: safeHoldAddress,
    abi: safeHoldAbi,
    functionName: "isPro",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: secondsLeft, refetch: refetchSeconds } = useReadContract({
    address: safeHoldAddress,
    abi: safeHoldAbi,
    functionName: "proSecondsLeft",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  // ---- on-chain write: Go Pro ------------------------------------------
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // react-query v5 dropped onSuccess from queries, so refetch from an effect.
  useEffect(() => {
    if (isSuccess) {
      refetchIsPro();
      refetchSeconds();
    }
  }, [isSuccess, refetchIsPro, refetchSeconds]);

  function subscribe() {
    if (price === undefined) return;
    writeContract({ address: safeHoldAddress, abi: safeHoldAbi, functionName: "subscribe", value: price });
  }

  // Browse without a wallet; only ask for one when the user taps Go Pro,
  // then continue straight into the transaction once connected.
  const wantsPro = useRef(false);
  useEffect(() => {
    if (isConnected && wantsPro.current && price !== undefined) {
      wantsPro.current = false;
      subscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, price]);
  useEffect(() => {
    if (!connectModalOpen && !isConnected) wantsPro.current = false;
  }, [connectModalOpen, isConnected]);

  function goPro() {
    if (isConnected) return subscribe();
    wantsPro.current = true;
    openConnectModal?.();
  }

  // Round up: right after subscribing, 29d 23h 59m should read as 30 days.
  const daysLeft = secondsLeft !== undefined ? Math.ceil(Number(secondsLeft) / 86400) : null;

  const v = token?.verdict;
  const next = token?.nextUnlock;

  return (
    <div className="app-grid">
      {/* ------------------------------------------------------ score card */}
      <section className="card">
        <div className="card-head">
          <h1 className="card-title">Check a token</h1>
          <div className="tabs" role="tablist" aria-label="Demo tokens">
            {DEMO_TOKENS.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={active === s}
                className={active === s ? "tab tab-on" : "tab"}
                onClick={() => lookup(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) lookup(query.trim());
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by symbol, e.g. AVAX"
            aria-label="Token symbol"
          />
          <button type="submit" className="btn btn-secondary" disabled={loading || !query.trim()}>
            Check
          </button>
        </form>

        {lookupError && <p className="err">{lookupError}</p>}

        {token && v && (
          <div className={`result band-${v.band} ${loading ? "is-loading" : ""}`}>
            <div className="result-top">
              <ScoreRing score={v.score} />
              <div className="result-text">
                <p className="result-sym">
                  {token.symbol} <span>{token.name}</span>
                </p>
                <p className={`status status-${v.band}`}>{v.headline}</p>
                <p className="muted">{v.detail}</p>
              </div>
            </div>

            <div className="facts">
              <div>
                <span>Next unlock</span>
                <strong>{next ? fmtDate(next.date) : "None scheduled"}</strong>
              </div>
              <div>
                <span>Size</span>
                <strong>{next ? `${fmtPct(next.pctOfCirculatingBps / 100)} of supply` : "—"}</strong>
              </div>
            </div>

            {next && (
              <div className="countdown-wrap">
                <span className="small muted">Time until unlock</span>
                <Countdown to={next.date} />
              </div>
            )}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- pro card */}
      <aside className="card pro">
        <div className="pro-head">
          <p className="eyebrow">SafeHold Pro</p>
          {isPro && <span className="pill pill-safe">Active</span>}
        </div>
        <p className="price">
          {price !== undefined ? formatEther(price) : "…"} AVAX <span>/ 30 days</span>
        </p>

        <ul className="checklist">
          <li>Alerts before every unlock on your watchlist</li>
          <li>Full watchlist and faster refresh</li>
          <li>No auto-renew, paid on Avalanche</li>
        </ul>

        {isPro ? (
          <p className="ok">
            Pro is active{daysLeft !== null ? ` · ${daysLeft} days left` : ""}. Alerts enabled.
          </p>
        ) : (
          <button className="btn btn-primary btn-block" onClick={goPro} disabled={price === undefined || isPending || isConfirming}>
            {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming on Avalanche…" : "Go Pro"}
          </button>
        )}

        {isSuccess && hash && (
          <p className="ok small">
            Subscription confirmed ·{" "}
            <a href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">
              View on Snowtrace
            </a>
          </p>
        )}
        {writeError && (
          <p className="err">{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}</p>
        )}
        {!isConnected && !isPro && <p className="small muted">You&apos;ll be asked to connect a wallet.</p>}
      </aside>
    </div>
  );
}
