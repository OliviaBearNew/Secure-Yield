"use client";

import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";
import { FhevmInstance } from "../fhevm/fhevmTypes";
import { SecureYieldCalculatorABI } from "../abi/SecureYieldCalculatorABI";
import { SecureYieldCalculatorAddresses } from "../abi/SecureYieldCalculatorAddresses";

export const useSecureYield = (parameters: {
  instance: FhevmInstance | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
}) => {
  const { chainId, ethersSigner } = parameters;
  const [message, setMessage] = useState("");
  const [yieldHandle, setYieldHandle] = useState<string | undefined>(undefined);
  const [totalHandle, setTotalHandle] = useState<string | undefined>(undefined);

  const address = useMemo(() => {
    if (!chainId) return undefined;
    const e = (SecureYieldCalculatorAddresses as any)[String(chainId)];
    return e?.address as `0x${string}` | undefined;
  }, [chainId]);

  const canRefresh = Boolean(address && ethersSigner);
  const refresh = useCallback(() => {
    if (!address || !ethersSigner) return;
    const c = new ethers.Contract(address, SecureYieldCalculatorABI.abi, ethersSigner);
    Promise.all([c.getLastYield(), c.getLastTotal()]).then(([y, t]: [string, string]) => {
      setYieldHandle(y); setTotalHandle(t); setMessage("Draft refresh done");
    }).catch(() => setMessage("Refresh failed"));
  }, [address, ethersSigner]);

  return { contractAddress: address, canRefresh, refresh, yieldHandle, totalHandle, message } as const;
};
