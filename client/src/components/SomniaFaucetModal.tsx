import React, { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Layers,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { SOMNIA_SHANNON_TESTNET, PROOFCAST_ANCHOR_CONTRACT } from "@/lib/web3/somnia";

interface SomniaFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SomniaFaucetModal({ isOpen, onClose }: SomniaFaucetModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [networkAdded, setNetworkAdded] = useState(false);

  if (!isOpen) return null;

  const chainId = SOMNIA_SHANNON_TESTNET.id;
  const rpcUrl = SOMNIA_SHANNON_TESTNET.rpcUrls.default.http[0];
  const explorerUrl = SOMNIA_SHANNON_TESTNET.blockExplorers.default.url;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddSomniaNetwork = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${chainId.toString(16)}`,
              chainName: "Somnia Shannon Testnet",
              nativeCurrency: {
                name: "Somnia Test Token",
                symbol: "STT",
                decimals: 18,
              },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: [explorerUrl],
            },
          ],
        });
        setNetworkAdded(true);
        setTimeout(() => setNetworkAdded(false), 4000);
      } catch (err) {
        console.error("Failed to add Somnia chain:", err);
      }
    } else {
      alert("Please connect or install MetaMask / Web3 wallet.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0e1218] p-6 shadow-2xl text-[#e8e6de] sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
            <Coins size={15} /> Somnia Shannon // Testnet Quick-Start & Faucet
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#8e8c84] transition hover:border-white/30 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleAddSomniaNetwork}
            className="flex w-full items-center justify-between rounded-xl bg-[#c8f06a] p-4 text-left font-bold text-[#151515] transition hover:bg-[#d8fa7a] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <PlusCircle size={20} />
              <div>
                <div className="text-sm">1-Click Add Somnia Shannon to Wallet</div>
                <div className="text-xs font-normal text-[#2a3810]">
                  Adds Chain ID 50312 & RPC parameters automatically
                </div>
              </div>
            </div>
            {networkAdded ? <Check size={18} className="text-[#151515]" /> : <ArrowUpRight size={18} />}
          </button>

          <a
            href="https://testnet.somnia.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 p-4 text-left font-bold text-white transition hover:border-[#c8f06a]/40 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <Coins size={20} className="text-[#c8f06a]" />
              <div>
                <div className="text-sm">Claim Free Somnia STT Tokens (Faucet)</div>
                <div className="text-xs font-normal text-[#8e8c84]">
                  Official Somnia Shannon testnet faucet for gas fees
                </div>
              </div>
            </div>
            <ExternalLink size={16} className="text-[#8e8c84]" />
          </a>
        </div>

        {/* Technical Network Specs */}
        <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 space-y-2.5 text-xs font-mono">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e8c84] mb-2">
            Somnia Shannon Parameters
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8e8c84]">Network Name:</span>
            <span className="font-bold text-white">Somnia Shannon Testnet</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8e8c84]">Chain ID:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">{chainId} (0xc488)</span>
              <button
                onClick={() => copyText(String(chainId), "chainId")}
                className="text-[#8e8c84] hover:text-white"
              >
                {copiedKey === "chainId" ? <Check size={12} className="text-[#c8f06a]" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8e8c84]">RPC Endpoint:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#c8f06a]">{rpcUrl}</span>
              <button
                onClick={() => copyText(rpcUrl, "rpc")}
                className="text-[#8e8c84] hover:text-white"
              >
                {copiedKey === "rpc" ? <Check size={12} className="text-[#c8f06a]" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8e8c84]">ProofCast Anchor Contract:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white truncate max-w-[180px]">{PROOFCAST_ANCHOR_CONTRACT}</span>
              <button
                onClick={() => copyText(PROOFCAST_ANCHOR_CONTRACT, "contract")}
                className="text-[#8e8c84] hover:text-white"
              >
                {copiedKey === "contract" ? <Check size={12} className="text-[#c8f06a]" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Explorer Link */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#c8f06a] hover:underline"
          >
            Somnia Block Explorer <ExternalLink size={12} />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 font-bold text-white hover:bg-white/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
