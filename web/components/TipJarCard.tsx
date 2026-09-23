"use client";

import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useEffect, useState } from "react";
import { tipJarAbi, tipJarAddress } from "@/lib/contract";

/**
 * THE FOUR HOOKS THAT COVER ~90% OF A HACKATHON dAPP
 * --------------------------------------------------
 *  useAccount                  - who is connected
 *  useReadContract             - read state (free, no wallet popup)
 *  useWriteContract            - send a transaction (wallet popup)
 *  useWaitForTransactionReceipt- wait for it to be mined
 *
 * The pending state from that last hook is the difference between a demo that
 * looks broken ("I clicked and nothing happened") and one that looks finished.
 * Do not skip it.
 */
export function TipJarCard() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("0.01");
  const [message, setMessage] = useState("");

  // ---- READS -----------------------------------------------------------
  const { data: jarName } = useReadContract({
    address: tipJarAddress,
    abi: tipJarAbi,
    functionName: "name",
  });

  const { data: total, refetch: refetchTotal } = useReadContract({
    address: tipJarAddress,
    abi: tipJarAbi,
    functionName: "totalTips",
  });

  const { data: mine, refetch: refetchMine } = useReadContract({
    address: tipJarAddress,
    abi: tipJarAbi,
    functionName: "tipsBy",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) }, // don't fire until we have an address
  });

  // ---- WRITE -----------------------------------------------------------
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // NOTE: react-query v5 removed the onSuccess callback from queries, so you
  // cannot refetch from inside the hook options - it silently never fires.
  // Watch the flag with an effect instead. This bites people constantly.
  useEffect(() => {
    if (isSuccess) {
      refetchTotal();
      refetchMine();
    }
  }, [isSuccess, refetchTotal, refetchMine]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    writeContract({
      address: tipJarAddress,
      abi: tipJarAbi,
      functionName: "tip",
      args: [message],
      value: parseEther(amount || "0"), // ALWAYS parseEther - never send a float
    });
  }

  return (
    <section className="card">
      <h2>{jarName ?? "TipJar"}</h2>

      <dl className="stats">
        <div>
          <dt>Total tips</dt>
          <dd>{total !== undefined ? `${formatEther(total)} AVAX` : "-"}</dd>
        </div>
        <div>
          <dt>Yours</dt>
          <dd>{mine !== undefined ? `${formatEther(mine)} AVAX` : "-"}</dd>
        </div>
      </dl>

      <form onSubmit={submit}>
        <label>
          Amount (AVAX)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.01"
          />
        </label>

        <label>
          Message
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="good luck"
            maxLength={80}
          />
        </label>

        <button type="submit" disabled={!isConnected || isPending || isConfirming}>
          {isPending ? "Confirm in wallet..." : isConfirming ? "Mining..." : "Send tip"}
        </button>
      </form>

      {!isConnected && <p className="hint">Connect a wallet to tip.</p>}
      {isSuccess && hash && (
        <p className="ok">
          Sent.{" "}
          <a href={`https://testnet.snowtrace.io/tx/${hash}`} target="_blank" rel="noreferrer">
            View on Snowtrace
          </a>
        </p>
      )}
      {error && <p className="err">{(error as { shortMessage?: string }).shortMessage ?? error.message}</p>}
    </section>
  );
}
