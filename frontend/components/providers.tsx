"use client";

import { MetaMaskProvider } from "../fhevm/hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider } from "../fhevm/hooks/metamask/useMetaMaskEthersSigner";
import { InMemoryStorageProvider } from "../fhevm/hooks/useInMemoryStorage";

export function FhevmProvider({ children }: { children: React.ReactNode }) {
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider initialMockChains={{ 31337: "http://localhost:8545" }}>
        <InMemoryStorageProvider>
          {children}
        </InMemoryStorageProvider>
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
}

