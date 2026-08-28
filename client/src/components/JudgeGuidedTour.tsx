import React, { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Cpu,
  Fingerprint,
  Layers,
  LockKeyhole,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

interface JudgeGuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JudgeGuidedTour({ isOpen, onClose }: JudgeGuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      stepNumber: "01",
      phase: "Observe",
      title: "Live Somnia DreamDEX Market Sourcing",
      icon: Compass,
      accent: "#c8f06a",
      headline: "Real-time indexer read with visible liquidity & spread.",
      body: "ProofCast connects directly to Somnia DreamDEX binary event contracts. It reads live orderbook depth, calculates bid/ask spreads in basis points, and never fabricates synthetic market data.",
      actionText: "Explore Live Markets",
      actionHref: "/signal",
      previewBadge: "Live Ingestion",
      codeSnippet: "DreamDEX Event Contract → Spread (bps) + Order Depth + Midpoint",
    },
    {
      stepNumber: "02",
      phase: "Understand",
      title: "EventForge Dual-Layer AI Intelligence",
      icon: Cpu,
      accent: "#c8f06a",
      headline: "Layer A (Deterministic Math) + Layer B (Structured AI Reasoning).",
      body: "EventForge calculates a baseline probability from order-flow microstructure and spread penalties, then synthesizes bullish arguments, downside liquidity risks, and disagreement analysis without altering mathematical outputs.",
      actionText: "Inspect Decision Surface",
      actionHref: "/market",
      previewBadge: "Deterministic + AI",
      codeSnippet: "Model Prob = Midpoint ± f(Spread, Imbalance) • Zero Hallucination",
    },
    {
      stepNumber: "03",
      phase: "Challenge",
      title: "Pre-Commit Triangulation & Executable Edge",
      icon: Scale,
      accent: "#f04b2f",
      headline: "Compare Market vs EventForge vs You & Test Slippage.",
      body: "Before committing, ProofCast calculates your true Executable Edge after spread and slippage. It forces forecasters through the Counter-Thesis Challenge: What could make your position wrong?",
      actionText: "Test Pre-Commit Edge",
      actionHref: "/market",
      previewBadge: "Pre-Commit Challenge",
      codeSnippet: "Executable Edge = Forecast % - Best Ask % - Spread Friction",
    },
    {
      stepNumber: "04",
      phase: "Commit",
      title: "Draft → Review → Freeze SHA-256 Decision Receipt",
      icon: Fingerprint,
      accent: "#c8f06a",
      headline: "Immutable decision freeze capturing the exact evidence snapshot.",
      body: "Forecasters state their probability, direction, conviction, and counter-thesis. The server atomically captures the exact market snapshot and generates a 32-byte cryptographic SHA-256 digest.",
      actionText: "View Decision Surface",
      actionHref: "/market",
      previewBadge: "SHA-256 Digest",
      codeSnippet: "Receipt Hash = SHA-256(MarketSnapshot + Forecast + Rationale)",
    },
    {
      stepNumber: "05",
      phase: "Anchor",
      title: "Somnia Shannon L1 On-Chain Proof",
      icon: ShieldCheck,
      accent: "#c8f06a",
      headline: "Permanent timestamped record on Somnia blockchain.",
      body: "Through ProofCastAnchor.sol, forecasters anchor their decision hash permanently on Somnia Shannon Testnet. The transaction emits an immutable event verifiable on the Somnia Block Explorer.",
      actionText: "Inspect Proof Profile",
      actionHref: "/proof",
      previewBadge: "Somnia Shannon L1",
      codeSnippet: "ProofCastAnchor.sol → anchorProof(bytes32 receiptHash, string marketId)",
    },
    {
      stepNumber: "06",
      phase: "Resolve",
      title: "Automated, Idempotent Settlement Daemon",
      icon: Zap,
      accent: "#f04b2f",
      headline: "Background resolution worker with retries and zero duplicates.",
      body: "When DreamDEX event contracts reach expiry, the background resolution worker detects on-chain settlement, maps deterministic binary outcomes, and idempotently records verified resolution records.",
      actionText: "View Resolution Engine",
      actionHref: "/proof",
      previewBadge: "Idempotent Daemon",
      codeSnippet: "Resolution Worker → Retry Backoff + Idempotent Verify + Diagnostics",
    },
    {
      stepNumber: "07",
      phase: "Prove",
      title: "Brier Calibration Scoring & Lifetime Proven Tiers",
      icon: Trophy,
      accent: "#c8f06a",
      headline: "Strict mathematical error calculation ($BS = (f - o)^2$).",
      body: "Scoring reflects true calibration over 5 probability bins with early prediction bonuses. ProofCast refuses to show vanity scores for small samples (< 5), protecting institutional credibility.",
      actionText: "View Global Leaderboard",
      actionHref: "/leaderboard",
      previewBadge: "Brier Calibration",
      codeSnippet: "Brier Score = (Forecast - Outcome)² • Proven Tier (≥5 Verified)",
    },
  ];

  const step = tourSteps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0d1117] p-6 shadow-2xl text-[#e8e6de] sm:p-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
            <Sparkles size={14} /> Judge Guided Tour // 45-Second Walkthrough
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-[#8e8c84] transition hover:border-white/30 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {tourSteps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? "bg-[#c8f06a] shadow-[0_0_12px_rgba(200,240,106,0.6)]"
                  : idx < currentStep
                  ? "bg-[#c8f06a]/50"
                  : "bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Active Step Content */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#131822] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#c8f06a]">
              <StepIcon size={15} /> Step {step.stepNumber} // {step.phase}
            </span>
            <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-mono text-[#a09e96]">
              {step.previewBadge}
            </span>
          </div>

          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {step.title}
          </h2>

          <div className="mt-2 text-sm font-semibold text-[#c8f06a]">
            {step.headline}
          </div>

          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#b4b2aa]">
            {step.body}
          </p>

          {/* Technical code/flow pill */}
          <div className="mt-4 rounded-lg border border-white/5 bg-black/50 p-3 font-mono text-xs text-[#a09e96]">
            <span className="text-white/40 block text-[10px] uppercase font-bold mb-0.5">Verification Rule:</span>
            {step.codeSnippet}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#8e8c84] disabled:opacity-30 hover:border-white/30 hover:text-white"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setCurrentStep(prev => (prev < tourSteps.length - 1 ? prev + 1 : 0))}
              className="flex items-center gap-1 rounded-lg bg-[#c8f06a] px-4 py-2 text-xs font-bold text-[#151515] transition hover:bg-[#d8fa7a]"
            >
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <RotateCcw size={13} /> Restart Tour
                </>
              ) : (
                <>
                  Next Step ({currentStep + 2}/7) <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={step.actionHref}
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c8f06a] hover:underline"
            >
              {step.actionText} <ArrowUpRight size={13} />
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
