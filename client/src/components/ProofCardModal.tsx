import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ExternalLink, ShieldCheck, Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface ProofCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: {
    id: number;
    marketId?: string;
    forecast?: {
      direction: "UP" | "DOWN";
      probabilityBps: number;
      confidence: string;
      thesis?: string;
    };
    marketSnapshot?: {
      marketId?: string;
      question?: string;
      asset?: string;
      network?: string;
    };
    anchorTxHash?: string | null;
    anchorAddress?: string | null;
    createdAt?: string | Date;
    resolutions?: Array<{
      outcome: "YES" | "NO" | "VOID";
      verificationStatus: string;
      evidenceHash?: string;
    }>;
  } | null;
}

export function ProofCardModal({ isOpen, onClose, receipt }: ProofCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const forecast = receipt?.forecast;
  const snapshot = receipt?.marketSnapshot;
  const resolution = receipt?.resolutions?.find((r) => r.verificationStatus === "VERIFIED");
  const isAnchored = !!receipt?.anchorTxHash;
  const probPct = forecast ? (forecast.probabilityBps / 100).toFixed(1) : "50.0";
  const question = snapshot?.question || `Somnia Event Market (${receipt?.marketId || ""})`;

  // Render high-res proof badge to canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !receipt) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 2;
    canvas.width = 600 * scale;
    canvas.height = 360 * scale;
    ctx.scale(scale, scale);

    // Dark cyber-gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 600, 360);
    bgGradient.addColorStop(0, "#0a0e14");
    bgGradient.addColorStop(1, "#0f1622");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 600, 360);

    // Subtle neon border & radial glow
    ctx.strokeStyle = isAnchored ? "rgba(215, 243, 107, 0.4)" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 580, 340);

    // Header eyebrow
    ctx.fillStyle = "#d7f36b";
    ctx.font = "bold 10px monospace";
    ctx.fillText("PROOFCAST // ON-CHAIN DECISION RECEIPT", 30, 42);

    // Receipt ID & Seal
    ctx.fillStyle = "#8b96a8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`#RC-${String(receipt.id).padStart(5, "0")}`, 500, 42);

    // Market question (wrapped)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    const truncatedQuestion = question.length > 55 ? `${question.slice(0, 52)}…` : question;
    ctx.fillText(truncatedQuestion, 30, 80);

    // Forecast Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(30, 105, 255, 110);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(30, 105, 255, 110);

    ctx.fillStyle = "#8b96a8";
    ctx.font = "10px monospace";
    ctx.fillText("COMMITTED FORECAST", 45, 128);

    ctx.fillStyle = forecast?.direction === "UP" ? "#d7f36b" : "#ff7b72";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(`${probPct}% ${forecast?.direction || "UP"}`, 45, 168);

    ctx.fillStyle = "#8b96a8";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Confidence: ${forecast?.confidence || "HIGH"}`, 45, 195);

    // Status / Outcome Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(315, 105, 255, 110);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(315, 105, 255, 110);

    ctx.fillStyle = "#8b96a8";
    ctx.font = "10px monospace";
    ctx.fillText("SETTLEMENT & STATUS", 330, 128);

    if (resolution) {
      ctx.fillStyle = resolution.outcome === "YES" ? "#d7f36b" : "#ff7b72";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`RESOLVED: ${resolution.outcome}`, 330, 166);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px monospace";
      ctx.fillText("✓ VERIFIED ON-CHAIN", 330, 195);
    } else {
      ctx.fillStyle = "#a5baff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("ACTIVE POSITION", 330, 166);

      ctx.fillStyle = "#8b96a8";
      ctx.font = "11px monospace";
      ctx.fillText("Awaiting Settlement", 330, 195);
    }

    // Anchor Status Row
    ctx.fillStyle = isAnchored ? "rgba(215, 243, 107, 0.12)" : "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(30, 235, 540, 50);

    ctx.fillStyle = isAnchored ? "#d7f36b" : "#8b96a8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(
      isAnchored ? "⚡ SOMNIA SHANNON ON-CHAIN ANCHOR: VERIFIED" : "○ UNANCHORED DRAFT RECEIPT",
      45,
      256
    );

    ctx.fillStyle = "#8b96a8";
    ctx.font = "10px monospace";
    const txText = receipt.anchorTxHash
      ? `Tx: ${receipt.anchorTxHash.slice(0, 24)}…${receipt.anchorTxHash.slice(-8)}`
      : "Anchor to Somnia Shannon to generate permanent immutable proof";
    ctx.fillText(txText, 45, 273);

    // Footer Watermark
    ctx.fillStyle = "#6f7b8f";
    ctx.font = "10px monospace";
    ctx.fillText("VERIFIABLE PREDICTION INTELLIGENCE • PROOFCAST.IO", 30, 325);

    const dateStr = receipt.createdAt ? new Date(receipt.createdAt).toISOString().split("T")[0] : "2026-08-27";
    ctx.fillText(`STAMP: ${dateStr}`, 470, 325);
  }, [isOpen, receipt, isAnchored, probPct, question, forecast, resolution]);

  if (!receipt) return null;

  const downloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `proofcast-receipt-${receipt.id}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast.success("Proof Badge image downloaded!");
  };

  const shareText = `I committed an immutable forecast on @ProofCast with @Somnia_Network DreamDEX Event Contracts!\n\nReceipt #RC-${String(receipt.id).padStart(5, "0")}: ${probPct}% ${forecast?.direction || "UP"}\n${isAnchored ? "⚡ Anchored On-Chain (Somnia Shannon)" : ""}\n\nInspect verified proof:`;

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin + "/proof")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToFarcaster = () => {
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(window.location.origin + "/proof")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyProofText = () => {
    navigator.clipboard.writeText(`${shareText}\n${window.location.origin}/proof`);
    setCopied(true);
    toast.success("Proof link & badge text copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#0a0e14] p-6 text-white shadow-2xl backdrop-blur-2xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-white">
            <ShieldCheck className="text-[#d7f36b]" size={20} />
            Cryptographic Proof Badge
          </DialogTitle>
        </DialogHeader>

        {/* Live Canvas Preview */}
        <div className="mt-4 flex w-full justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2 shadow-inner">
          <canvas ref={canvasRef} className="h-auto w-full max-w-[560px] rounded-lg shadow-2xl" />
        </div>

        {/* Action Controls */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={downloadImage}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10 active:scale-95 cursor-pointer"
          >
            <Download size={14} /> Download PNG
          </button>
          <button
            onClick={shareToTwitter}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#1DA1F2]/40 bg-[#1DA1F2]/10 text-xs font-semibold text-[#1DA1F2] transition-all hover:bg-[#1DA1F2]/20 active:scale-95 cursor-pointer"
          >
            <Share2 size={14} /> Share on X
          </button>
          <button
            onClick={shareToFarcaster}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#855DCD]/40 bg-[#855DCD]/10 text-xs font-semibold text-[#c0a4f5] transition-all hover:bg-[#855DCD]/20 active:scale-95 cursor-pointer"
          >
            <Share2 size={14} /> Farcaster
          </button>
          <button
            onClick={copyProofText}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d7f36b]/30 bg-[#d7f36b]/10 text-xs font-bold text-[#d7f36b] transition-all hover:bg-[#d7f36b]/20 active:scale-95 cursor-pointer"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
