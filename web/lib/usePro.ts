"use client";

import { useEffect, useRef } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { safeHoldAbi, safeHoldAddress } from "@/lib/contract";

/**
 * Everything the UI needs for the on-chain Pro subscription: price, status,
 * and a goPro() that asks for a wallet only when needed, then continues
 * straight into the transaction once connected.
 */
export function usePro(onSubscribed?: () => void) {
  const { address, isConnected } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();

  const { data: price } = useReadContract({ address: safeHoldAddress, abi: safeHoldAbi, functionName: "price" });

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

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // react-query v5 dropped onSuccess from queries, so react to the flag.
  useEffect(() => {
    if (isSuccess) {
      refetchIsPro();
      refetchSeconds();
      onSubscribed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  function subscribe() {
    if (price === undefined) return;
    writeContract({ address: safeHoldAddress, abi: safeHoldAbi, functionName: "subscribe", value: price });
  }

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

  return {
    address,
    price,
    isPro: Boolean(isPro),
    // Round up: right after subscribing, 29d 23h 59m reads as 30 days.
    daysLeft: secondsLeft !== undefined ? Math.ceil(Number(secondsLeft) / 86400) : null,
    goPro,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: error ? ((error as { shortMessage?: string }).shortMessage ?? error.message) : null,
  };
}
