import { ethers } from "ethers";
import { useEffect, useState } from "react";
import type { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance } from "./internal/fhevm";

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
}): { instance: FhevmInstance | undefined; error: Error | undefined; status: FhevmGoState; refresh: () => void } {
  const { provider, enabled = true } = parameters;
  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [status, setStatus] = useState<FhevmGoState>("idle");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !provider) { setInstance(undefined); setError(undefined); setStatus("idle"); return; }
    const ac = new AbortController();
    setStatus("loading");
    createFhevmInstance({ provider: provider as any, signal: ac.signal })
      .then((i) => { if (!ac.signal.aborted) { setInstance(i); setStatus("ready"); } })
      .catch((e) => { if (!ac.signal.aborted) { setError(e); setStatus("error"); } });
    return () => ac.abort();
  }, [enabled, provider, tick]);

  return { instance, error, status, refresh: () => setTick((t) => t + 1) };
}
