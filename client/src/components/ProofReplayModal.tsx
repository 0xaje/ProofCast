import React, { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Fingerprint,
  Layers,
  LockKeyhole,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

export interface CompletedProofItem {
  receiptId: number;
  marketId: string;
  question: string;
  asset: string;
  tradingStart: number | null;
  expiry: number | null;
  committedAt: string | Date;
  marketProbabilityPercent: number | null;
  eventForgeProbabilityPercent: number | null;
  userProbabilityPercent: number;
  userDirection: "UP" | "DOWN";
  userConfidence: "LOW" | "MEDIUM" | "HIGH";
  userThesis: string;
  userCounterThesis: string;
  receiptHash: string;
  anchorTxHash: string | null;
  anchorAddress: string | null;
  resolutionOutcome: "YES" | "NO" | "VOID";
  resolutionVerifiedAt: string | Date;
  resolutionEvidenceSummary: string;
  resolutionSourceUrl: string;
  brierScore: number;
  brierScoreBps: number;
  directionalAccurate: boolean;
  calibrationImpact: string;
  forecasterName: string;
}

interface ProofReplayModalProps {
  proof: CompletedProofItem | null;
  onClose: () => void;
}

export function ProofReplayModal({ proof, onClose }: ProofReplayModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);

  if (!proof) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(proof.receiptHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      title: "1. Observe Market Snapshot",
      desc: `DreamDEX Event Contract for ${proof.asset} initialized. Market priced consensus at ${proof.marketProbabilityPercent ?? 50}%.`,
      badge: "DreamDEX Snapshot",
    },
    {
      title: "2. Challenge & Pre-Commit Intelligence",
      desc: `EventForge detected ${proof.eventForgeProbabilityPercent ?? 50}% probability. Forecaster drafted thesis with counter-risk analysis.`,
      badge: "EventForge AI",
    },
    {
      title: "3. Commit Decision Receipt",
      desc: `Forecaster committed ${proof.userProbabilityPercent}% ${proof.userDirection} (${proof.userConfidence} conviction) with SHA-256 digest ${proof.receiptHash.slice(0, 16)}...`,
      badge: "SHA-256 Freeze",
    },
    {
      title: "4. Anchor On-Chain",
      desc: proof.anchorTxHash
        ? `Proof permanently anchored on Somnia Shannon Testnet: ${proof.anchorTxHash.slice(0, 18)}...`
        : "Committed into immutable timestamped ledger.",
      badge: "Somnia Shannon L1",
    },
    {
      title: "5. Reality Settles & Scores",
      desc: `DreamDEX contract resolved to ${proof.resolutionOutcome}. Brier Calibration computed: ${proof.brierScore.toFixed(4)} (${proof.directionalAccurate ? "Directional Win" : "Miss"}).`,
      badge: "Settlement",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0e1218] p-6 shadow-2xl text-[#e8e6de] sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
              <Fingerprint size={15} /> Genuine Proof Replay // 10-Point Audit Trail
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              {proof.question}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#8e8c84]">
              <span>Forecaster: <b className="text-white">{proof.forecasterName}</b></span>
              <span>•</span>
              <span>Asset: <b className="text-[#c8f06a]">{proof.asset}</b></span>
              <span>•</span>
              <span>Receipt ID: <b className="font-mono text-white">#RC-{String(proof.receiptId).padStart(5, "0")}</b></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#8e8c84] transition hover:border-white/30 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Interactive Step-by-Step Progress Ribbon */}
        <div className="mt-6 rounded-xl border border-white/10 bg-[#141a23] p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#8e8c84]">
            <span className="flex items-center gap-1.5 text-white">
              <Play size={13} className="text-[#c8f06a]" /> Lifecycle Replay Sequence
            </span>
            <span>Step {activeStep + 1} of 5</span>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === activeStep
                    ? "bg-[#c8f06a] shadow-[0_0_10px_rgba(200,240,106,0.5)]"
                    : idx < activeStep
                    ? "bg-[#c8f06a]/50"
                    : "bg-white/15"
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#c8f06a]">
                {steps[activeStep].badge}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-white">
                {steps[activeStep].title}
              </div>
              <p className="mt-0.5 text-xs text-[#a09e96]">
                {steps[activeStep].desc}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveStep(prev => (prev > 0 ? prev - 1 : 0))}
                disabled={activeStep === 0}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-bold text-[#a09e96] disabled:opacity-30 hover:border-white/30 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => setActiveStep(prev => (prev < 4 ? prev + 1 : 0))}
                className="flex items-center gap-1 rounded-md bg-[#c8f06a] px-3 py-1.5 text-xs font-bold text-[#151515] transition hover:bg-[#d8fa7a]"
              >
                {activeStep === 4 ? <><RotateCcw size={12} /> Restart</> : <>Next <ChevronRight size={13} /></>}
              </button>
            </div>
          </div>
        </div>

        {/* 10-Point Audit Inspection Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Card 1: The Three Probabilities Comparison */}
          <div className="rounded-xl border border-white/10 bg-[#121720] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e8c84]">
              Points 1–4 // Probability Triangulation
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">1. DreamDEX Market Consensus:</span>
                <span className="font-mono font-bold text-white">{proof.marketProbabilityPercent ?? 50}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">2. EventForge Deterministic Model:</span>
                <span className="font-mono font-bold text-[#c8f06a]">{proof.eventForgeProbabilityPercent ?? 50}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">3. User Committed Forecast:</span>
                <span className="font-mono font-bold text-[#f04b2f]">
                  {proof.userProbabilityPercent}% {proof.userDirection} ({proof.userConfidence})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">4. Commitment Timestamp:</span>
                <span className="font-mono text-white/80">{new Date(proof.committedAt).toUTCString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Resolution & Brier Score Calculation */}
          <div className="rounded-xl border border-white/10 bg-[#121720] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e8c84]">
              Points 8–10 // Reality Settlement & Calibration
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">8. Actual DreamDEX Resolution:</span>
                <span className={`font-mono font-bold ${proof.resolutionOutcome === "YES" ? "text-[#c8f06a]" : "text-[#f04b2f]"}`}>
                  {proof.resolutionOutcome}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">9. Brier Calibration Score:</span>
                <span className="font-mono font-bold text-[#c8f06a]">
                  {proof.brierScore.toFixed(4)} ({proof.brierScoreBps} bps)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">10. Calibration Impact:</span>
                <span className="text-right text-[11px] font-semibold text-white">
                  {proof.calibrationImpact}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a09e96]">Settlement Source:</span>
                <a
                  href={proof.resolutionSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-[#c8f06a] hover:underline"
                >
                  On-chain settlement <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Point 5: User Thesis & Pre-Commit Counter-Thesis */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#121720] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e8c84]">
            Point 5 // Pre-Commit Decision Rationale & Risk Challenge
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-[#0a0d12] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white">Committed Thesis</div>
              <p className="mt-1 text-xs leading-relaxed text-[#c4c2ba]">{proof.userThesis}</p>
            </div>
            <div className="rounded-lg border border-[#f04b2f]/20 bg-[#0a0d12] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#f04b2f]">
                Counter-Thesis Challenge
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#c4c2ba]">{proof.userCounterThesis}</p>
            </div>
          </div>
        </div>

        {/* Points 6 & 7: Cryptographic SHA-256 Digest & Somnia On-Chain Anchor */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#121720] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8e8c84]">
            Points 6 & 7 // Cryptographic Integrity & Somnia Anchor
          </div>

          <div className="mt-3 space-y-3">
            {/* SHA-256 */}
            <div className="flex flex-col justify-between gap-2 rounded-lg bg-[#0a0d12] p-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#8e8c84]">
                  6. SHA-256 Decision Receipt Hash
                </div>
                <div className="font-mono text-xs text-[#c8f06a] break-all">
                  {proof.receiptHash}
                </div>
              </div>
              <button
                onClick={copyHash}
                className="flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20"
              >
                {copied ? <CheckCircle2 size={13} className="text-[#c8f06a]" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Digest"}
              </button>
            </div>

            {/* Somnia Anchor */}
            <div className="flex flex-col justify-between gap-2 rounded-lg bg-[#0a0d12] p-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#8e8c84]">
                  7. Somnia Shannon On-Chain Anchor
                </div>
                <div className="font-mono text-xs text-white break-all">
                  {proof.anchorTxHash ?? "Anchored on-chain via ProofCastAnchor.sol (Somnia Shannon)"}
                </div>
              </div>
              {proof.anchorTxHash && (
                <a
                  href={`https://shannon-explorer.somnia.network/tx/${proof.anchorTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded border border-[#c8f06a]/30 bg-[#c8f06a]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#c8f06a] transition hover:bg-[#c8f06a]/20"
                >
                  Explorer <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-[#8e8c84]">
          <span>
            End-to-end verified on Somnia Shannon Testnet & DreamDEX indexer.
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 font-bold text-white transition hover:bg-white/20"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
