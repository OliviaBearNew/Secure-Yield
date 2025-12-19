import { isAddress, Eip1193Provider, JsonRpcProvider } from "ethers";
import type {
  FhevmInitSDKOptions,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  FhevmWindowType,
} from "./fhevmTypes";
import { isFhevmWindowType, RelayerSDKLoader } from "./RelayerSDKLoader";
import { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

export class FhevmReactError extends Error {
  code: string;
  constructor(code: string, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "FhevmReactError";
  }
}

function throwFhevmError(
  code: string,
  message?: string,
  cause?: unknown
): never {
  throw new FhevmReactError(code, message, cause ? { cause } : undefined);
}

const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return (window as unknown as FhevmWindowType).relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK: FhevmInitSDKType = async (
  options?: FhevmInitSDKOptions
) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await (window as unknown as FhevmWindowType).relayerSDK.initSDK(options);
  (window as any).relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== "string") return false;
  if (!isAddress(a)) return false;
  return true;
}

export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";
  }
}

type FhevmRelayerStatusType =
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating";

type RelayerSdkConfigEntry = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cfg: any;
};

function getSdkConfigs(relayerSDK: unknown): RelayerSdkConfigEntry[] {
  if (!relayerSDK || typeof relayerSDK !== "object") return [];
  const rs: any = relayerSDK as any;
  return [
    { name: "ZamaEthereumConfig", cfg: rs.ZamaEthereumConfig },
    { name: "SepoliaConfig", cfg: rs.SepoliaConfig },
  ].filter((e) => Boolean(e.cfg));
}

function formatSupportedChains(configs: RelayerSdkConfigEntry[]): string {
  const ids = configs
    .map((c) => (typeof c.cfg?.chainId === "number" ? c.cfg.chainId : undefined))
    .filter((x): x is number => typeof x === "number");
  if (ids.length === 0) return "unknown";
  return ids.join(", ");
}

function pickSdkConfigForChain(
  relayerSDK: unknown,
  chainId: number
): RelayerSdkConfigEntry | undefined {
  const configs = getSdkConfigs(relayerSDK);
  // Prefer explicit chainId match if available.
  const byId = configs.find(
    (c) => typeof c.cfg?.chainId === "number" && c.cfg.chainId === chainId
  );
  if (byId) return byId;

  // Fallback for older SDK objects that may not expose cfg.chainId.
  // This is intentionally conservative to avoid selecting the wrong config.
  if (chainId === 11155111) {
    return configs.find((c) => c.name === "SepoliaConfig");
  }
  return undefined;
}

async function getChainId(
  providerOrUrl: Eip1193Provider | string
): Promise<number> {
  if (typeof providerOrUrl === "string") {
    const provider = new JsonRpcProvider(providerOrUrl);
    return Number((await provider.getNetwork()).chainId);
  }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("web3_clientVersion", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "WEB3_CLIENTVERSION_ERROR",
      `The URL ${rpcUrl} is not a Web3 node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<
  | {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    }
  | undefined
> {
  const version = await getWeb3Client(rpcUrl);
  if (typeof version !== "string" || !version.toLowerCase().includes("hardhat")) {
    return undefined;
  }
  try {
    const metadata = await getFHEVMRelayerMetadata(rpcUrl);
    if (!metadata || typeof metadata !== "object") return undefined;
    if (!("ACLAddress" in metadata) || typeof metadata.ACLAddress !== "string" || !metadata.ACLAddress.startsWith("0x")) return undefined;
    if (!("InputVerifierAddress" in metadata) || typeof metadata.InputVerifierAddress !== "string" || !metadata.InputVerifierAddress.startsWith("0x")) return undefined;
    if (!("KMSVerifierAddress" in metadata) || typeof metadata.KMSVerifierAddress !== "string" || !metadata.KMSVerifierAddress.startsWith("0x")) return undefined;
    return metadata as any;
  } catch {
    return undefined;
  }
}

async function getFHEVMRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("fhevm_relayer_metadata", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "FHEVM_RELAYER_METADATA_ERROR",
      `The URL ${rpcUrl} is not a FHEVM Hardhat node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

async function resolve(
  providerOrUrl: Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<ResolveResult> {
  const chainId = await getChainId(providerOrUrl);
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;
  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    ...(mockChains ?? {}),
  };
  if (Object.hasOwn(_mockChains, chainId)) {
    if (!rpcUrl) rpcUrl = _mockChains[chainId];
    return { isMock: true, chainId, rpcUrl };
    }
  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const { signal, onStatusChange, provider: providerOrUrl, mockChains } = parameters;
  const throwIfAborted = () => { if (signal.aborted) throw new FhevmAbortError(); };
  const notify = (status: FhevmRelayerStatusType) => { if (onStatusChange) onStatusChange(status); };

  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);

  if (isMock) {
    const fhevmRelayerMetadata = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl!);
    if (fhevmRelayerMetadata) {
      notify("creating");
      const fhevmMock = await import("./mock/fhevmMock");
      const mockInstance = await fhevmMock.fhevmMockCreateInstance({ rpcUrl: rpcUrl!, chainId, metadata: fhevmRelayerMetadata });
      throwIfAborted();
      return mockInstance;
    }
    throwFhevmError(
      "LOCAL_NODE_UNAVAILABLE",
      `Local FHEVM node was not detected at ${rpcUrl}. Please start an FHEVM Hardhat node and try again.`
    );
  }

  throwIfAborted();

  if (!isFhevmWindowType(window, console.log)) {
    notify("sdk-loading");
    await fhevmLoadSDK();
    throwIfAborted();
    notify("sdk-loaded");
  }

  if (!isFhevmInitialized()) {
    notify("sdk-initializing");
    await fhevmInitSDK();
    throwIfAborted();
    notify("sdk-initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;
  const picked = pickSdkConfigForChain(relayerSDK, chainId);
  if (!picked) {
    const supported = formatSupportedChains(getSdkConfigs(relayerSDK));
    throwFhevmError(
      "UNSUPPORTED_CHAIN",
      `Unsupported network (chainId=${chainId}). Please switch your wallet to a supported network (e.g. ${supported}).`
    );
  }

  const sdkConfig = picked.cfg as FhevmInstanceConfig;
  const aclAddress = (sdkConfig as any).aclContractAddress;
  if (!checkIsAddress(aclAddress)) {
    throw new Error(`Invalid address: ${aclAddress}`);
  }

  const config: FhevmInstanceConfig = {
    ...sdkConfig,
    network: providerOrUrl as any,
    publicKey: (sdkConfig as any).publicKey,
    publicParams: (sdkConfig as any).publicParams,
  } as any;

  notify("creating");
  let instance: FhevmInstance;
  try {
    instance = await relayerSDK.createInstance(config);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const code = String(e?.code ?? "");
    if (code === "BAD_DATA" || msg.includes("getKmsSigners")) {
      const supported = formatSupportedChains(getSdkConfigs(relayerSDK));
      throwFhevmError(
        "RELAYER_UNAVAILABLE",
        `FHEVM Relayer is not available on chainId=${chainId}. Please switch your wallet to a supported network (e.g. ${supported}) and try again.`,
        e
      );
    }
    throw e;
  }
  throwIfAborted();
  return instance;
};
