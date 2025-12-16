"use client";

import { useState } from "react";
import { useMetaMaskEthersSigner } from "../fhevm/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "../fhevm/useFhevm";
import { useSecureYield } from "../hooks/useSecureYield";

export function App() {
  const { provider, chainId, accounts, isConnected, connect, ethersSigner } = useMetaMaskEthersSigner();
  const { instance, status } = useFhevm({ provider, chainId, enabled: true });
  const dapp = useSecureYield({ instance, chainId, ethersSigner });
  const [principal, setPrincipal] = useState("");
  const [time, setTime] = useState("");

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return (
    <div>
      <div>Chain: {chainId ?? "-"}</div>
      <div>Account: {accounts?.[0] ?? "-"}</div>
      <div>FHEVM: {status}</div>
      <input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="Principal" />
      <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Time" />
      <button disabled={!dapp.canRefresh} onClick={() => dapp.refresh()}>Refresh</button>
      <div>Yield: {dapp.yieldHandle ?? "-"}</div>
      <div>Total: {dapp.totalHandle ?? "-"}</div>
      {dapp.message && <div>{dapp.message}</div>}
    </div>
  );
}
