import React from "react";
import { Cpu, ShieldCheck, Lock, Radio } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PROOFCAST_ANCHOR_CONTRACT } from "@/lib/web3/somnia";

export function HeroInstrument() {
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000 });
  const market = snapshot.data?.markets?.[0];
  const state = snapshot.data?.state;

  const probability = market?.midPercent ?? market?.lastPricePercent ?? 62;
  const spreadBps = market?.spreadBps ?? 140;
  const question = market?.question ?? "Somnia DreamDEX Binary Event Contract";

  return (
    <div className="relative w-full h-[520px] bg-[#121410] border border-[#151515] shadow-[16px_16px_0_#151515] p-6 flex flex-col justify-between overflow-hidden text-[#f8f6ef] font-sans selection:bg-[#c8f06a] selection:text-[#151515]">
      {/* Industrial blueprint grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(200,240,106,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(200,240,106,0.035)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(240,75,47,0.08),transparent_40%)]" />

      {/* Top Telemetry Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#c8f06a]/40 bg-[#c8f06a]/15 text-[#c8f06a] font-bold text-xs">
            ↗
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
              Somnia Shannon Testnet
            </div>
            <div className="font-mono text-[11px] text-white/70">Chain ID: 50312 · DreamDEX Pool</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex h-2 w-2 rounded-full ${state === "LIVE" ? "bg-[#c8f06a] animate-pulse" : "bg-[#e9b65b]"}`} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#c8f06a] font-bold">
            {state ? `SOMNIA ${state}` : "CONNECTING RPC"}
          </span>
        </div>
      </div>

      {/* Main Evidence Visualizer */}
      <div className="relative z-10 space-y-4 my-auto">
        {/* Layer 1: Market Observation */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/50 tracking-wider">
            <span>01 · DreamDEX Market Signal</span>
            <span className="font-mono text-[#c8f06a]">{spreadBps} BPS SPREAD</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <div className="font-display text-base font-bold text-white tracking-tight line-clamp-1">
              {question}
            </div>
            <div className="font-mono text-2xl font-bold text-[#c8f06a] shrink-0">{probability}%</div>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c8f06a] to-[#f04b2f] transition-all duration-700 ease-out rounded-full"
              style={{ width: `${probability}%` }}
            />
          </div>
        </div>

        {/* Layer 2: EventForge Intelligence & Dual Model */}
        <div className="rounded-xl border border-[#f04b2f]/30 bg-[#f04b2f]/[0.06] p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#f04b2f] tracking-wider">
            <span className="flex items-center gap-1.5">
              <Cpu size={12} /> 02 · EventForge Dual-Layer Engine
            </span>
            <span className="rounded bg-[#f04b2f]/20 px-1.5 py-0.5 text-[9px] font-mono text-[#f04b2f]">
              LAYER A + LAYER B
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-white/80">Deterministic Fair Value:</span>
            <span className="font-mono font-bold text-white">Verified Model Signal</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-white/80">Executable Edge:</span>
            <span className="font-mono font-bold text-[#c8f06a]">Net of Spread &amp; Friction</span>
          </div>
        </div>

        {/* Layer 3: Immutable Decision Receipt Anchor */}
        <div className="rounded-xl border border-white/15 bg-black/40 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/50 tracking-wider">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[#c8f06a]" /> 03 · On-Chain Anchor
            </span>
            <span className="font-mono text-[9px] text-white/40">NON-CUSTODIAL</span>
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-white/90 truncate">
            CONTRACT: <span className="text-[#c8f06a]">{PROOFCAST_ANCHOR_CONTRACT}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-white/60">
            <span>ProofCastAnchor.sol</span>
            <span className="text-[#c8f06a] font-bold">VERIFIED ON-CHAIN ✓</span>
          </div>
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] font-mono text-white/60">
        <span className="flex items-center gap-1.5">
          <Lock size={11} className="text-[#c8f06a]" /> Zero Private Key Custody
        </span>
        <span className="text-white/40">v1.0.0 · Proof Instrument</span>
      </div>

      {/* Decorative Corner Accents */}
      <div className="absolute top-2 left-2 text-[8px] font-mono text-white/20">+</div>
      <div className="absolute top-2 right-2 text-[8px] font-mono text-white/20">+</div>
      <div className="absolute bottom-2 left-2 text-[8px] font-mono text-white/20">+</div>
      <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/20">+</div>
    </div>
  );
}
