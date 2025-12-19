"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FhevmInstance } from "../fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "../fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "../fhevm/GenericStringStorage";
import { SecureYieldCalculatorABI } from "../abi/SecureYieldCalculatorABI";
import { SecureYieldCalculatorAddresses } from "../abi/SecureYieldCalculatorAddresses";

type ClearValueType = { handle: string; clear: string | bigint | boolean };

function getDappByChainId(chainId: number | undefined) {
  if (!chainId) return { abi: SecureYieldCalculatorABI.abi } as const;
  const entry = SecureYieldCalculatorAddresses[chainId.toString() as keyof typeof SecureYieldCalculatorAddresses];
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) return { abi: SecureYieldCalculatorABI.abi, chainId } as const;
  return { address: entry?.address as `0x${string}` | undefined, chainId: entry?.chainId ?? chainId, chainName: entry?.chainName, abi: SecureYieldCalculatorABI.abi } as const;
}

export const useSecureYield = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: React.RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: React.RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const { instance, fhevmDecryptionSignatureStorage, chainId, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner } = parameters;

  const [yieldHandle, setYieldHandle] = useState<string | undefined>(undefined);
  const [totalHandle, setTotalHandle] = useState<string | undefined>(undefined);
  const [clearYield, setClearYield] = useState<ClearValueType | undefined>(undefined);
  const [clearTotal, setClearTotal] = useState<ClearValueType | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [myRateBps, setMyRateBps] = useState<number | undefined>(undefined);
  const [myRateIsCustom, setMyRateIsCustom] = useState<boolean | undefined>(undefined);

  const ref = useRef<{ abi: typeof SecureYieldCalculatorABI.abi; address?: `0x${string}`; chainId?: number } | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isCalculatingRef = useRef<boolean>(isCalculating);

  const dapp = useMemo(() => {
    const c = getDappByChainId(chainId);
    ref.current = c as any;
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!dapp) return undefined;
    // @ts-ignore
    return Boolean(dapp.address) && (dapp as any).address !== ethers.ZeroAddress;
  }, [dapp]);

  const canRefresh = useMemo(() => Boolean((dapp as any).address && ethersSigner && !isRefreshing), [
    // @ts-ignore
    dapp.address, ethersSigner, isRefreshing]);

  const canDecrypt = useMemo(() => Boolean((dapp as any).address && instance && ethersSigner && !isRefreshing && !isDecrypting && (yieldHandle || totalHandle)), [
    // @ts-ignore
    dapp.address, instance, ethersSigner, isRefreshing, isDecrypting, yieldHandle, totalHandle]);

  const canCalculate = useMemo(() => Boolean((dapp as any).address && instance && ethersSigner && !isCalculating), [
    // @ts-ignore
    dapp.address, instance, ethersSigner, isCalculating]);

  const refresh = useCallback(() => {
    if (isRefreshingRef.current) return;
    // @ts-ignore
    if (!ref.current || !ref.current?.chainId || !ref.current?.address || !ethersSigner) {
      setYieldHandle(undefined);
      setTotalHandle(undefined);
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    // @ts-ignore
    const thisChainId = ref.current.chainId;
    // @ts-ignore
    const addr = ref.current.address!;
    // @ts-ignore
    const contract = new ethers.Contract(addr, ref.current.abi, ethersSigner);
    Promise.all([contract.getLastYield(), contract.getLastTotal(), contract.getMyRate()])
      .then(([yield_, total, rate]: [string, string, [number, boolean]]) => {
        if (sameChain.current(thisChainId) && addr === (ref.current as any)?.address) {
          setYieldHandle(yield_);
          setTotalHandle(total);
          if (Array.isArray(rate) && rate.length === 2) {
            setMyRateBps(Number(rate[0]));
            setMyRateIsCustom(Boolean(rate[1]));
          }
        }
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e: any) => {
        setMessage("Unable to refresh data from the smart contract. Please check your connection and try again.");
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersSigner, sameChain]);

  useEffect(() => { refresh(); }, [refresh]);

  const decrypt = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    // @ts-ignore
    if (!dapp.address || !instance || !ethersSigner || (!yieldHandle && !totalHandle)) return;
    const thisChainId = chainId;
    // @ts-ignore
    const addr = dapp.address;
    const thisEthersSigner = ethersSigner;
    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting your calculation results. This may take a moment...");
    const run = async () => {
      const isStale = () => addr !== (ref.current as any)?.address || !sameChain.current(thisChainId) || !sameSigner.current(thisEthersSigner);
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance!,
          [addr as `0x${string}`],
          ethersSigner!,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("Unable to create decryption signature. Please try again."); return; }
        if (isStale()) { setMessage("Session has changed. Please try the operation again."); return; }
        const handles: { handle: string; contractAddress: `0x${string}` }[] = [];
        if (yieldHandle && yieldHandle !== ethers.ZeroHash) handles.push({ handle: yieldHandle, contractAddress: addr as `0x${string}` });
        if (totalHandle && totalHandle !== ethers.ZeroHash) handles.push({ handle: totalHandle, contractAddress: addr as `0x${string}` });
        if (handles.length === 0) { setMessage("No encrypted data found to decrypt. Please run a calculation first."); return; }
        const res = await instance!.userDecrypt(
          handles,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        if (isStale()) { setMessage("Session has changed. Please try the operation again."); return; }
        if (yieldHandle) setClearYield({ handle: yieldHandle, clear: res[yieldHandle] });
        if (totalHandle) setClearTotal({ handle: totalHandle, clear: res[totalHandle] });
        setMessage("Success! Your calculation results have been decrypted and are now visible.");
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };
    run();
  }, [fhevmDecryptionSignatureStorage, ethersSigner, (dapp as any).address, instance, yieldHandle, totalHandle, chainId, sameChain, sameSigner]);

  const calculate = useCallback((params: { principal: number | bigint; time: number }) => {
    if (isRefreshingRef.current || isCalculatingRef.current) return;
    // @ts-ignore
    if (!dapp.address || !instance || !ethersSigner) return;
    const thisChainId = chainId;
    // @ts-ignore
    const addr = dapp.address;
    const thisEthersSigner = ethersSigner;
    const contract = new ethers.Contract(addr!, (dapp as any).abi, thisEthersSigner);
    isCalculatingRef.current = true;
    setIsCalculating(true);
    setMessage("Encrypting your investment data and calculating yield securely...");
    const run = async () => {
      const isStale = () => addr !== (ref.current as any)?.address || !sameChain.current(thisChainId) || !sameSigner.current(thisEthersSigner);
      try {
        await new Promise((r) => setTimeout(r, 100));
        const input = instance!.createEncryptedInput(addr!, thisEthersSigner!.address);
        input.add64(BigInt(params.principal));
        input.add32(params.time);
        const enc = await input.encrypt();
        if (isStale()) { setMessage("Session has changed. Please try the calculation again."); return; }
        const tx: ethers.TransactionResponse = await contract.calculate(
          enc.handles[0],
          enc.handles[1],
          enc.inputProof
        );
        const receipt = await tx.wait();
        if (receipt && receipt.status === 1) {
          setMessage("Calculation completed successfully! Click 'View Results' to decrypt and see your yield.");
        } else {
          setMessage("Transaction was processed but the result is unclear. Please refresh your data to check the status.");
        }
        refresh();
      } catch (e: any) {
        console.error("[useSecureYield] Calculation error:", e);
        console.error("[useSecureYield] Error name:", e?.name);
        console.error("[useSecureYield] Error message:", e?.message);
        console.error("[useSecureYield] Error code:", e?.code);
        console.error("[useSecureYield] Error reason:", e?.reason);
        if (e?.data) {
          console.error("[useSecureYield] Error data:", e.data);
        }
        if (e?.error) {
          console.error("[useSecureYield] Error error:", e.error);
        }
        
        const errorMsg = String(e);
        const errorReason = e?.reason || e?.message || errorMsg;
        
        if (errorMsg.includes("user rejected") || errorReason.includes("user rejected")) {
          setMessage("Transaction was cancelled. You can try again when ready.");
        } else if (errorMsg.includes("insufficient funds") || errorReason.includes("insufficient funds")) {
          setMessage("Insufficient funds to complete the transaction. Please check your wallet balance.");
        } else if (errorMsg.includes("execution reverted") || errorReason.includes("execution reverted")) {
          const revertReason = e?.error?.data?.message || e?.error?.message || e?.reason || "Unknown revert reason";
          setMessage(`Transaction reverted: ${revertReason}. Please check your inputs and contract state.`);
        } else if (errorMsg.includes("network") || errorReason.includes("network")) {
          setMessage("Network error. Please check your connection and try again.");
        } else {
          const detailedError = errorReason.length > 100 ? errorReason.substring(0, 100) + "..." : errorReason;
          setMessage(`Calculation failed: ${detailedError}. Please verify your inputs and try again.`);
        }
      } finally {
        isCalculatingRef.current = false;
        setIsCalculating(false);
      }
    };
    run();
  }, [ (dapp as any).address, (dapp as any).abi, instance, ethersSigner, chainId, sameChain, sameSigner, refresh]);

  const setCustomRate = useCallback(async (newRateBps: number) => {
    // @ts-ignore
    if (!dapp.address || !ethersSigner) return;
    try {
      const addr = (dapp as any).address as `0x${string}`;
      const contract = new ethers.Contract(addr, (dapp as any).abi, ethersSigner);
      setMessage("Updating your custom yield rate. Please confirm the transaction...");
      const tx: ethers.TransactionResponse = await contract.setCustomRate(newRateBps);
      await tx.wait();
      setMessage(`Custom rate of ${(newRateBps / 100).toFixed(2)}% has been set successfully!`);
      refresh();
    } catch (e: any) {
      const errorMsg = String(e);
      if (errorMsg.includes("user rejected")) {
        setMessage("Rate update was cancelled. Your current rate remains unchanged.");
      } else {
        setMessage("Failed to update your yield rate. Please try again.");
      }
    }
  }, [ethersSigner, (dapp as any).address, (dapp as any).abi, refresh]);

  const clearCustomRate = useCallback(async () => {
    // @ts-ignore
    if (!dapp.address || !ethersSigner) return;
    try {
      const addr = (dapp as any).address as `0x${string}`;
      const contract = new ethers.Contract(addr, (dapp as any).abi, ethersSigner);
      setMessage("Resetting to the system default yield rate. Please confirm the transaction...");
      const tx: ethers.TransactionResponse = await contract.clearCustomRate();
      await tx.wait();
      setMessage("Successfully reset to the system default yield rate.");
      refresh();
    } catch (e: any) {
      const errorMsg = String(e);
      if (errorMsg.includes("user rejected")) {
        setMessage("Rate reset was cancelled. Your custom rate remains active.");
      } else {
        setMessage("Failed to reset the yield rate. Please try again.");
      }
    }
  }, [ethersSigner, (dapp as any).address, (dapp as any).abi, refresh]);

  return {
    contractAddress: (dapp as any).address as `0x${string}` | undefined,
    isDeployed,
    canRefresh,
    canDecrypt,
    canCalculate,
    refresh,
    decrypt,
    calculate,
    yieldHandle,
    totalHandle,
    clearYield: clearYield?.clear,
    clearTotal: clearTotal?.clear,
    isRefreshing,
    isDecrypting,
    isCalculating,
    message,
    myRateBps,
    myRateIsCustom,
    setCustomRate,
    clearCustomRate,
  } as const;
};

