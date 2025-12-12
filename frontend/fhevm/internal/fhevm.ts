import { Eip1193Provider } from "ethers";
import { FhevmInstance } from "../fhevmTypes";

export class FhevmAbortError extends Error {
  constructor() {
    super("FHEVM operation was cancelled");
    this.name = "FhevmAbortError";
  }
}

export async function createFhevmInstance(params: {
  provider: Eip1193Provider | string;
  signal: AbortSignal;
}): Promise<FhevmInstance> {
  const { provider, signal } = params;
  if (signal.aborted) throw new FhevmAbortError();

  if (typeof window === "undefined" || !(window as any).relayerSDK) {
    throw new Error("window.relayerSDK is not available");
  }

  const relayerSDK = (window as any).relayerSDK;
  if (!relayerSDK.__initialized__) {
    const ok = await relayerSDK.initSDK();
    relayerSDK.__initialized__ = ok;
    if (!ok) throw new Error("relayerSDK.initSDK failed");
  }

  const sdkConfig = relayerSDK.ZamaEthereumConfig || relayerSDK.SepoliaConfig;
  if (!sdkConfig) throw new Error("RelayerSDK config is missing");
  if (signal.aborted) throw new FhevmAbortError();
  return (await relayerSDK.createInstance({ ...sdkConfig, network: provider } as any)) as FhevmInstance;
}
