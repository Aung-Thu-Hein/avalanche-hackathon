"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { safeHoldAbi, safeHoldAddress } from "@/lib/contract";

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

export function SafeHoldCard() {
  const { address, isConnected } = useAccount();

  const [query, setQuery] = useState("AVAX");
  const [token, setToken] = useState<Token | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- score lookup (off-chain, from the cached snapshot) ---------------
  async function lookup(q: string) {
    setLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/tokens?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) {
        setToken(null);
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

  function goPro() {
    if (price === undefined) return;
    writeContract({
      address: safeHoldAddress,
      abi: safeHoldAbi,
      functionName: "subscribe",
      value: price,
    });
  }

  const daysLeft =
    secondsLeft !== undefined ? Math.floor(Number(secondsLeft) / 86400) : null;

  return (
    <section className="card">
      {/* ---- search ---- */}
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          lookup(query);
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a token…"
          aria-label="Token symbol"
        />
        <button type="submit" disabled={loading}>
          {loading ? "…" : "Check"}
        </button>
      </form>

      <p className="hint demo-hint">Try AVAX · GUN · 2Z</p>

      {lookupError && <p className="err">{lookupError}</p>}

      {/* ---- score ---- */}
      {token && (
        <div className={`score score-${token.verdict.band}`}>
          <div className="score-number">{token.verdict.score}</div>
          <div className="score-text">
            <div className="score-sym">
              {token.symbol} <span className="muted">{token.name}</span>
            </div>
            <div className="score-headline">{token.verdict.headline}</div>
            <div className="score-detail">{token.verdict.detail}</div>
          </div>
        </div>
      )}

      {/* ---- pro ---- */}
      <div className="pro">
        {isPro ? (
          <p className="ok">
            Pro active{daysLeft !== null ? ` — ${daysLeft} days left` : ""}. Alerts enabled.
          </p>
        ) : (
          <>
            <button className="primary" onClick={goPro} disabled={!isConnected || isPending || isConfirming}>
              {isPending
                ? "Confirm in wallet…"
                : isConfirming
                  ? "Confirming on Avalanche…"
                  : `Go Pro — ${price !== undefined ? formatEther(price) : "…"} AVAX / 30 days`}
            </button>
            <p className="hint">
              {isConnected
                ? "Unlocks alerts before every unlock on your watchlist."
                : "Connect a wallet to go Pro."}
            </p>
          </>
        )}

        {isSuccess && hash && (
          <p className="ok">
            Subscription confirmed.{" "}
            <a href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">
              View on Snowtrace
            </a>
          </p>
        )}
        {writeError && (
          <p className="err">
            {(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
          </p>
        )}
      </div>
    </section>
  );
}
