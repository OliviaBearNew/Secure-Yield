"use client";

import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../fhevm/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../fhevm/hooks/metamask/useMetaMaskEthersSigner";
import { useSecureYield } from "../hooks/useSecureYield";
import { useState } from "react";

export function App() {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const { instance: fhevmInstance, status: fhevmStatus, error: fhevmError } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const dapp = useSecureYield({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [principal, setPrincipal] = useState<string>("");
  const [time, setTime] = useState<string>("");

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">SecureYield</h1>
            <p className="text-slate-600 text-lg">Privacy-First Investment Calculator</p>
          </div>
          <div className="card">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">Connect Your Wallet</h2>
              <p className="text-slate-600 leading-relaxed">
                Get started by connecting your wallet to access private yield calculations. Your financial data stays completely encrypted.
              </p>
            </div>
            <button onClick={connect} className="btn-primary w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, hasError: boolean) => {
    if (hasError) {
      return <span className="status-badge status-error">Connection Failed</span>;
    }
    if (status === 'ready') {
      return <span className="status-badge status-ready">Connected</span>;
    }
    if (status === 'loading' || status === 'initializing') {
      return <span className="status-badge status-loading">Connecting</span>;
    }
    return <span className="status-badge status-default">Disconnected</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SecureYield Calculator</h1>
          <p className="text-slate-600">Private investment yield calculations with FHEVM technology</p>
        </div>

        {/* Connection Status */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Connection Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Network</div>
              <div className="text-sm font-semibold text-slate-900">{chainId ? `Chain ${chainId}` : 'Not Connected'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Wallet Address</div>
              <div className="text-sm font-semibold text-slate-900 font-mono">
                {accounts?.[0] ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : 'Not Connected'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Encryption Engine</div>
              <div>{getStatusBadge(fhevmStatus, !!fhevmError)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Smart Contract</div>
              <div className="text-sm font-semibold text-slate-900 font-mono">
                {dapp.contractAddress ? `${dapp.contractAddress.slice(0, 6)}...${dapp.contractAddress.slice(-4)}` : 'Not Available'}
              </div>
            </div>
          </div>
        </div>

        {/* Rate Configuration */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Yield Rate Settings
          </h2>
          <div className="bg-emerald-50 rounded-lg p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-slate-600 mb-1">Current Rate</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-slate-900">
                    {dapp.myRateBps !== undefined ? `${(dapp.myRateBps / 100).toFixed(2)}%` : 'Loading...'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dapp.myRateIsCustom ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {dapp.myRateIsCustom ? 'Custom Rate' : 'Default Rate'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Customize your yield rate to match your investment strategy and risk profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const currentRate = dapp.myRateBps !== undefined ? (dapp.myRateBps / 100).toFixed(2) : "5.00";
                  const v = prompt("Enter your preferred yield rate (as percentage, e.g., 5.00 for 5%)", currentRate);
                  if (v !== null) {
                    const percent = Number(v);
                    if (!Number.isNaN(percent) && percent >= 0 && Number.isFinite(percent)) {
                      const bps = Math.round(percent * 100);
                      dapp.setCustomRate(bps);
                    } else {
                      alert("Please enter a valid percentage (e.g., 5.00)");
                    }
                  }
                }}
                className="btn-primary flex-1"
              >
                Set Custom Rate
              </button>
              <button onClick={() => dapp.clearCustomRate()} className="btn-secondary flex-1">
                Reset to Default
              </button>
            </div>
          </div>
        </div>

        {/* Calculation Form */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculate Your Yield
          </h2>
          <p className="text-slate-600 mb-6">
            Enter your investment details below. All calculations are performed with complete privacy using homomorphic encryption.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Investment Amount</label>
              <input
                type="text"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="e.g., 100000"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (Months)</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g., 12"
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              disabled={!dapp.canCalculate}
              onClick={() => {
                if (!principal || !time) {
                  alert("Please enter both investment amount and time period");
                  return;
                }
                dapp.calculate({ principal: BigInt(principal || "0"), time: Number(time || 0) });
              }}
              className={`btn-primary flex-1 min-w-[140px] ${!dapp.canCalculate ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {dapp.isCalculating ? 'Calculating...' : 'Calculate Yield'}
            </button>
            <button
              disabled={!dapp.canRefresh}
              onClick={() => dapp.refresh()}
              className={`btn-secondary flex-1 min-w-[140px] ${!dapp.canRefresh ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {dapp.isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              disabled={!dapp.canDecrypt}
              onClick={() => dapp.decrypt()}
              className={`btn-secondary flex-1 min-w-[140px] ${!dapp.canDecrypt ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {dapp.isDecrypting ? 'Decrypting...' : 'View Results'}
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Calculation Results
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Your investment data is encrypted and secured. Click "View Results" to decrypt and display the final calculations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Encrypted Yield Handle</div>
              <div className="text-sm font-mono text-slate-900 mb-2 break-all">
                {dapp.yieldHandle ? `${dapp.yieldHandle.slice(0, 8)}...${dapp.yieldHandle.slice(-6)}` : 'Not calculated'}
              </div>
              <div className="text-xs text-slate-500">
                {dapp.yieldHandle ? 'Encrypted and stored' : 'Awaiting calculation'}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Encrypted Total Handle</div>
              <div className="text-sm font-mono text-slate-900 mb-2 break-all">
                {dapp.totalHandle ? `${dapp.totalHandle.slice(0, 8)}...${dapp.totalHandle.slice(-6)}` : 'Not calculated'}
              </div>
              <div className="text-xs text-slate-500">
                {dapp.totalHandle ? 'Encrypted and stored' : 'Awaiting calculation'}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Yield Amount</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">
                {dapp.clearYield !== undefined ? String(dapp.clearYield) : 'Hidden'}
              </div>
              <div className="text-xs text-slate-500">
                {dapp.clearYield !== undefined ? 'Decrypted result' : 'Click "View Results" to decrypt'}
              </div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Amount</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">
                {dapp.clearTotal !== undefined ? String(dapp.clearTotal) : 'Hidden'}
              </div>
              <div className="text-xs text-slate-500">
                {dapp.clearTotal !== undefined ? 'Decrypted result' : 'Click "View Results" to decrypt'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {dapp.message && (
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-4">
            <div className="text-sm text-slate-700">{dapp.message}</div>
          </div>
        )}

        {fhevmError && (
          <div className="bg-red-50 border-l-4 border-red-600 rounded-r-lg p-4 mt-4">
            <div className="text-sm text-red-800 mb-2">
              <strong>Encryption service is currently unavailable.</strong> Please refresh the page and try again.
            </div>
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Error Details (Click to expand)
              </summary>
              <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono text-red-900 break-all">
                <div><strong>Error Name:</strong> {fhevmError.name}</div>
                <div><strong>Error Message:</strong> {fhevmError.message}</div>
                {fhevmError.stack && (
                  <div className="mt-1"><strong>Stack:</strong> {fhevmError.stack}</div>
                )}
                {(fhevmError as any).code && (
                  <div><strong>Error Code:</strong> {(fhevmError as any).code}</div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

