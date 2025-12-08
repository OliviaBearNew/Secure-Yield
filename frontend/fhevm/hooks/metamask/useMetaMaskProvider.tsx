"use client";

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { ethers } from "ethers";

export interface UseMetaMaskState {
  provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  connect: () => void;
  error: Error | undefined;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [accounts, setAccounts] = useState<string[] | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const connect = () => {
    if (!provider) return;
    (provider as any)
      .request({ method: "eth_requestAccounts" })
      .then((accs: string[]) => {
        setAccounts(accs);
        setIsConnected(accs && accs.length > 0);
      })
      .catch((e: any) => setError(e));
  };

  useEffect(() => {
    const detect = async () => {
      const anyWindow = window as any;
      if (anyWindow?.ethereum?.request) {
        setProvider(anyWindow.ethereum as ethers.Eip1193Provider);
        try {
          const cid = await anyWindow.ethereum.request({ method: "eth_chainId" });
          setChainId(Number.parseInt(cid, 16));
          const accs: string[] = await anyWindow.ethereum.request({ method: "eth_accounts" });
          setAccounts(accs);
          setIsConnected(accs && accs.length > 0);
          anyWindow.ethereum.on("chainChanged", (hex: string) => setChainId(Number.parseInt(hex, 16)));
          anyWindow.ethereum.on("accountsChanged", (accs2: string[]) => {
            setAccounts(accs2);
            setIsConnected(accs2 && accs2.length > 0);
          });
        } catch (e: any) {
          setError(e);
        }
      }
    };
    detect();
  }, []);

  return { provider, chainId, accounts, isConnected, connect, error };
}

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export function MetaMaskProvider({ children }: { children: React.ReactNode }) {
  const value = useMetaMaskInternal();
  return <MetaMaskContext.Provider value={value}>{children}</MetaMaskContext.Provider>;
}

export function useMetaMask() {
  const ctx = useContext(MetaMaskContext);
  if (!ctx) throw new Error("useMetaMask must be used within MetaMaskProvider");
  return ctx;
}
