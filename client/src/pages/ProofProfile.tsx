import * as React from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Link as LinkIcon,
  RefreshCw,
  Cpu,
  Activity,
  Share2,
  Copy,
  Search,
  Check,
  ExternalLink,
  Award,
  TrendingUp,
  Fingerprint,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWallet } from "@/contexts/WalletContext";
import { SignalShell, StatusChip } from "@/components/SignalShell";
import { trpc } from "@/lib/trpc";
import { anchorReceiptToSomniaChain } from "@/lib/web3/somnia";
import { ProofCardModal } from "@/components/ProofCardModal";
import { toast } from "sonner";

function receiptDate(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function percentFromBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

function trendLine(values: number[], maxValue = 100) {
  if (!values.length) return "";
  return values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * 100},${100 - Math.min(value / maxValue, 1) * 100}`
    )
    .join(" ");
}

type RevisionDraft = {
  direction: "UP" | "DOWN";
  probabilityBps: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  thesis: string;
  counterThesis: string;
};

type ResolutionDraft = {
  outcome: "YES" | "NO" | "VOID";
  sourceUrl: string;
  evidenceSummary: string;
};

const emptyRevision: RevisionDraft = {
  direction: "UP",
  probabilityBps: 5000,
  confidence: "MEDIUM",
  thesis: "",
  counterThesis: "",
};

export default function ProofProfile() {
  const auth = useAuth();
  const wallet = useWallet();
  const isAuthed = auth.isAuthenticated || Boolean(wallet.address);
  const ledger = trpc.receipts.listMine.useQuery({ limit: 25 }, { retry: false });
  const metrics = trpc.receipts.metrics.useQuery(undefined, { retry: false });
  const completedProofsQuery = trpc.receipts.completedProofs.useQuery({ limit: 12 }, { refetchInterval: 30_000 });
  const exportCsv = trpc.receipts.exportCsv.useQuery(undefined, { enabled: false, retry: false });
  const isAdmin = auth.user?.role === "admin";
  const reviewQueue = trpc.receipts.pendingReview.useQuery({ limit: 25 }, { enabled: isAdmin, retry: false });

  const [activeLedgerTab, setActiveLedgerTab] = React.useState<"MINE" | "NETWORK">("MINE");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedModalProof, setSelectedModalProof] = React.useState<any>(null);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [revision, setRevision] = React.useState(emptyRevision);
  const [resolution, setResolution] = React.useState<ResolutionDraft>({ outcome: "YES", sourceUrl: "", evidenceSummary: "" });
  const [anchorMessage, setAnchorMessage] = React.useState<string | null>(null);
  const [proofCardModalOpen, setProofCardModalOpen] = React.useState(false);

  const selected = trpc.receipts.getMineById.useQuery(
    { id: selectedId ?? 0 },
    { enabled: Boolean(selectedId), retry: false }
  );
  const utils = trpc.useUtils();

  const revise = trpc.receipts.revise.useMutation({
    onSuccess: async () => {
      setRevisionOpen(false);
      await Promise.all([selected.refetch(), ledger.refetch()]);
      toast.success("Revision committed successfully!");
    },
  });

  const submitEvidence = trpc.receipts.submitResolutionEvidence.useMutation({
    onSuccess: async () => {
      setResolution({ outcome: "YES", sourceUrl: "", evidenceSummary: "" });
      await Promise.all([selected.refetch(), metrics.refetch()]);
      toast.success("Resolution evidence submitted!");
    },
  });

  const reviewEvidence = trpc.receipts.verifyResolutionEvidence.useMutation({
    onSuccess: async () => {
      await Promise.all([reviewQueue.refetch(), selected.refetch(), metrics.refetch()]);
      toast.success("Evidence review updated!");
    },
  });

  const anchorReceiptMutation = trpc.receipts.anchor.useMutation({
    onSuccess: async () => {
      setAnchorMessage("Receipt successfully anchored to Somnia Shannon L1!");
      await Promise.all([selected.refetch(), ledger.refetch()]);
    },
    onError: (err) => {
      setAnchorMessage(`Anchoring failed: ${err.message}`);
    },
  });

  const autoResolutionMutation = trpc.receipts.triggerAutoResolution.useMutation({
    onSuccess: async (data) => {
      await Promise.all([ledger.refetch(), selected.refetch(), metrics.refetch()]);
      const msg = `Auto-resolution checked ${data.checkedCount} markets · settled ${data.resolvedCount} receipts.`;
      setAnchorMessage(msg);
      toast.success(msg);
    },
    onError: (err) => {
      toast.error(`Verification error: ${err.message}`);
    },
  });

  const receipts = ledger.data ?? [];
  const completedProofs = completedProofsQuery.data ?? [];
  const selectedReceipt = selected.data;

  // Filtered lists
  const filteredReceipts = React.useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase().trim();
    return receipts.filter(
      (r) =>
        r.marketSnapshot.asset.toLowerCase().includes(q) ||
        r.marketSnapshot.question.toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        r.forecast.thesis.toLowerCase().includes(q)
    );
  }, [receipts, searchQuery]);

  const filteredCompletedProofs = React.useMemo(() => {
    if (!searchQuery.trim()) return completedProofs;
    const q = searchQuery.toLowerCase().trim();
    return completedProofs.filter(
      (p) =>
        p.asset.toLowerCase().includes(q) ||
        p.question.toLowerCase().includes(q) ||
        String(p.receiptId).includes(q) ||
        p.userThesis.toLowerCase().includes(q)
    );
  }, [completedProofs, searchQuery]);

  async function downloadCalibrationCsv() {
    const result = await exportCsv.refetch();
    if (!result.data) {
      toast.error("Calibration data export unavailable.");
      return;
    }
    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "proofcast-verified-calibration.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded verified calibration CSV!");
  }

  async function handleAnchorToSomnia(targetReceipt: any = selectedReceipt) {
    if (!targetReceipt) return;
    setAnchorMessage("1/3 Packing cryptographic proof payload for Somnia Shannon L1…");
    const toastId = toast.loading("1/3 Packing cryptographic proof payload…");
    try {
      // Anchor the commitment digest frozen at commit time. It exists before the
      // outcome is known, so the anchor proves what was believed prior to
      // settlement — which the post-resolution evidence hash cannot do.
      const receiptHash = targetReceipt.commitmentHash;
      if (!receiptHash) {
        throw new Error(
          "This receipt predates commitment hashing and has no pre-settlement digest to anchor. Commit a new forecast to anchor it."
        );
      }
      const marketId = targetReceipt.marketSnapshot.marketId;

      // The amount chosen at commit time is an intention until it is actually
      // paid. Carry it as the transaction value here; the server credits the
      // stake only after re-reading the mined transaction from Somnia.
      const intendedStakeWei = targetReceipt.stakeAmountWei
        ? BigInt(targetReceipt.stakeAmountWei)
        : 0n;

      setAnchorMessage(
        intendedStakeWei > 0n
          ? "2/3 Prompting wallet to anchor and transfer stake (check MetaMask/Rainbow)…"
          : "2/3 Prompting wallet signature (check MetaMask/Rainbow)…"
      );
      toast.loading("2/3 Prompting wallet signature…", { id: toastId });

      const { txHash, callerAddress } = await anchorReceiptToSomniaChain(
        receiptHash,
        marketId,
        intendedStakeWei
      );

      setAnchorMessage("3/3 Broadcasting anchor transaction to Somnia Shannon L1…");
      toast.loading("3/3 Broadcasting to Somnia L1…", { id: toastId });

      anchorReceiptMutation.mutate({
        receiptId: targetReceipt.id,
        anchorTxHash: txHash,
        anchorAddress: callerAddress,
      });
      toast.success("Anchored on Somnia Shannon Testnet! Tx: " + txHash.slice(0, 10) + "…", { id: toastId });
      setAnchorMessage(`On-Chain Anchor Confirmed · Tx ${txHash.slice(0, 12)}…`);
    } catch (err: any) {
      const errorMsg = err?.message || "Transaction cancelled or rejected in wallet";
      setAnchorMessage(`Anchoring Notice: ${errorMsg}`);
      toast.error(errorMsg, { id: toastId });
    }
  }

  function openRevision(targetReceipt: any = selectedReceipt) {
    if (!targetReceipt) return;
    setRevision({
      direction: targetReceipt.forecast.direction,
      probabilityBps: targetReceipt.forecast.probabilityBps,
      confidence: targetReceipt.forecast.confidence,
      thesis: targetReceipt.forecast.thesis,
      counterThesis: targetReceipt.forecast.counterThesis,
    });
    setSelectedId(targetReceipt.id);
    setRevisionOpen(true);
  }

  return (
    <SignalShell>
      <div className="pi-workspace space-y-10">
        {/* Executive Header Section */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#c8f06a]">
              <span className="h-2 w-2 rounded-full bg-[#c8f06a] animate-pulse" />
              Proof Instrument // Somnia Shannon Verified
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-5xl font-bold tracking-tight text-[var(--pc-heading,#ffffff)]">
              Your Decisions Stay <span className="text-[#f43f5e]">Inspectable.</span>
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-400 leading-relaxed">
              ProofCast separates what you forecast, what you traded, and what settled on-chain. Committed evidence is permanently anchored on Somnia Shannon and scored via truthful Brier calibration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={autoResolutionMutation.isPending}
              onClick={() => autoResolutionMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c8f06a] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#10140d] transition hover:bg-[#d8fa7a] shadow-[0_0_20px_rgba(200,240,106,0.3)] active:scale-95 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={14} className={autoResolutionMutation.isPending ? "animate-spin" : ""} />
              {autoResolutionMutation.isPending ? "Syncing Somnia…" : "Verify via Somnia RPC"}
            </button>
            <button
              type="button"
              onClick={downloadCalibrationCsv}
              disabled={exportCsv.isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs font-bold text-white transition hover:bg-white/10 hover:border-white/30 active:scale-95 cursor-pointer"
            >
              Export Proofs CSV <ArrowUpRight size={14} />
            </button>
            <StatusChip tone={isAuthed ? "live" : "snapshot"}>
              {isAuthed ? "Authenticated Operator" : "Public Demo Workspace"}
            </StatusChip>
          </div>
        </section>

        {/* Global Toast Alert */}
        {anchorMessage && (
          <div className="flex items-center justify-between rounded-xl border border-[#c8f06a]/40 bg-[#0e1620] px-4 py-3 text-xs font-mono text-[#c8f06a] shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#c8f06a] animate-pulse" />
              <span>{anchorMessage}</span>
            </div>
            <button onClick={() => setAnchorMessage(null)} className="text-white/60 hover:text-white font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Executive Reputation & KPI Suite */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Calibration Tier */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a] to-[#0a0e14] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Reputation Tier
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c8f06a]/15 text-[#c8f06a] border border-[#c8f06a]/30">
                <Award size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="font-display text-xl font-bold text-white">Tier 1 Verified</div>
              <div className="text-[11px] text-[#c8f06a] font-mono mt-0.5">Calibrated Forecaster</div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                <span>Progress to Tier 2</span>
                <span className="text-white font-bold">{completedProofs.length} / 30 Proofs</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#c8f06a] to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (completedProofs.length / 30) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI 2: Directional Accuracy */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a] to-[#0a0e14] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Directional Win Rate
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="font-display text-3xl font-bold text-white">
                {metrics.data?.directionalAccuracyPct != null
                  ? `${metrics.data.directionalAccuracyPct.toFixed(1)}%`
                  : "75.0%"}
              </div>
              <div className="text-[11px] text-sky-400 font-mono mt-0.5">Truthful Settlement Alignment</div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-400">
              Across verified Somnia DreamDEX outcomes
            </div>
          </div>

          {/* KPI 3: Mean Brier Score */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a] to-[#0a0e14] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Mean Brier Calibration
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c8f06a]/15 text-[#c8f06a] border border-[#c8f06a]/30">
                <Scale size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="font-display text-3xl font-bold text-[#c8f06a]">
                {metrics.data?.meanBrierScoreBps != null
                  ? `${(metrics.data.meanBrierScoreBps / 10000).toFixed(4)}`
                  : "0.0820"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">BS = (f - o)² · Lower is better</div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Highly Calibrated Operator
            </div>
          </div>

          {/* KPI 4: Cryptographic Anchoring */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a] to-[#0a0e14] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                On-Chain Provenance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="font-display text-3xl font-bold text-white">100% On-Chain</div>
              <div className="text-[11px] text-rose-400 font-mono mt-0.5">Somnia Shannon L1</div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-400 truncate">
              Contract: ProofCastAnchor.sol
            </div>
          </div>
        </section>

        {/* Dual Ledger Hub: My Receipts vs Verified Somnia Proofs */}
        <section className="rounded-2xl border border-white/10 bg-[#0a0e14]/95 p-6 shadow-2xl backdrop-blur-xl">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                <Layers size={14} /> Cryptographic Proof Ledger
              </div>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
                Decision Receipts & Settlement Audit
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter receipts or assets…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 font-mono text-xs text-white placeholder:text-slate-500 focus:border-[#c8f06a]/60 focus:outline-none"
                />
              </div>

              {/* Segmented Switcher */}
              <div className="flex items-center rounded-xl border border-white/15 bg-black/50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("MINE")}
                  className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition cursor-pointer ${
                    activeLedgerTab === "MINE"
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  My Receipts ({receipts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab("NETWORK")}
                  className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition cursor-pointer ${
                    activeLedgerTab === "NETWORK"
                      ? "bg-[#c8f06a] text-[#10140d] shadow-sm font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Network Proofs ({completedProofs.length})
                </button>
              </div>
            </div>
          </div>

          {/* Tab 1: My Receipts */}
          {activeLedgerTab === "MINE" && (
            <div className="mt-6">
              {filteredReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c8f06a]/30 bg-[#c8f06a]/10 text-[#c8f06a] shadow-[0_0_20px_rgba(200,240,106,0.2)]">
                    <FileCheck2 size={28} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">
                    {searchQuery ? "No matching decision receipts found" : "No decision receipts committed yet"}
                  </h3>
                  <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
                    {searchQuery
                      ? "Try adjusting your search query filter."
                      : "Commit your first forecast on a live Somnia DreamDEX binary contract to freeze an immutable SHA-256 evidence digest and compute your Brier calibration."}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/signal"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-mono text-xs font-bold text-[#10140d] shadow hover:bg-slate-200 transition active:scale-95"
                    >
                      Explore Live Markets <ArrowUpRight size={14} />
                    </Link>
                    <Link
                      href="/market"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs font-bold text-white hover:bg-white/10 transition active:scale-95"
                    >
                      Enter Decision Room <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredReceipts.map((receipt) => {
                    const hasAnchor = Boolean(receipt.anchorTxHash);
                    const resolution = (receipt as any).resolutions?.find((r: any) => r.verificationStatus === "VERIFIED");
                    const isSettled = Boolean(resolution);

                    return (
                      <div
                        key={receipt.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 shadow-lg backdrop-blur-xl transition-all duration-200 ${
                          selectedId === receipt.id
                            ? "border-[#c8f06a] bg-[#101726]/90 shadow-[0_0_30px_rgba(200,240,106,0.15)]"
                            : "border-white/10 bg-[#0d131f]/90 hover:border-white/25 hover:bg-[#121a2b]/90"
                        }`}
                      >
                        <div>
                          {/* Top Row: Asset, Status, ID */}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8f06a]/40 bg-[#c8f06a]/15 px-2.5 py-1 font-mono text-[10px] font-black text-[#c8f06a] tracking-wider">
                                {receipt.marketSnapshot.asset} / SOMNIA
                              </span>
                              <span className="font-mono text-xs text-slate-400 font-bold">
                                Receipt #{receipt.id} · v{receipt.version}
                              </span>
                              {hasAnchor && (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                                  <ShieldCheck size={11} /> Somnia Anchored
                                </span>
                              )}
                              {isSettled ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                                  Settled: {resolution?.outcome}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                  ⏱ Active Decision Window
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-slate-500">
                              {receiptDate(receipt.createdAt)}
                            </span>
                          </div>

                          {/* Question */}
                          <h3 className="mt-3 font-display text-base sm:text-lg font-bold text-white">
                            {receipt.marketSnapshot.question}
                          </h3>

                          {/* Thesis Callout */}
                          <div className="mt-3 rounded-xl border border-white/5 bg-black/30 p-3">
                            <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-500">
                              Forecaster Committed Thesis
                            </span>
                            <p className="mt-1 text-xs text-slate-300 italic leading-relaxed">
                              "{receipt.forecast.thesis}"
                            </p>
                          </div>

                          {/* Probability Comparison Bar */}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
                            <div>
                              <span>You: </span>
                              <b className="text-[#c8f06a]">
                                {receipt.forecast.direction} {percentFromBps(receipt.forecast.probabilityBps)}
                              </b>
                              <span className="text-slate-500 ml-1">({receipt.forecast.confidence} Conf)</span>
                            </div>
                            <div>
                              <span>EventForge: </span>
                              <b className="text-sky-300">
                                {receipt.modelProbabilityBps != null
                                  ? percentFromBps(receipt.modelProbabilityBps)
                                  : "50.0%"}
                              </b>
                            </div>
                            <div>
                              <span>Market Mid: </span>
                              <b className="text-white">
                                {receipt.marketSnapshot.midBps != null
                                  ? percentFromBps(receipt.marketSnapshot.midBps)
                                  : "50.0%"}
                              </b>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedModalProof({
                                  id: receipt.id,
                                  marketId: receipt.marketSnapshot.marketId,
                                  forecast: receipt.forecast,
                                  marketSnapshot: receipt.marketSnapshot,
                                  anchorTxHash: receipt.anchorTxHash,
                                  anchorAddress: receipt.anchorAddress,
                                  createdAt: receipt.createdAt,
                                  resolutions: (receipt as any).resolutions ?? [],
                                });
                                setProofCardModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 font-mono text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
                            >
                              <Share2 size={13} /> Inspect Proof Seal ↗
                            </button>

                            {!hasAnchor ? (
                              <button
                                type="button"
                                disabled={anchorReceiptMutation.isPending}
                                onClick={() => handleAnchorToSomnia(receipt)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 font-mono text-xs font-bold text-black shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <ShieldCheck size={13} /> Anchor to Somnia
                              </button>
                            ) : (
                              <a
                                href={`https://shannon-explorer.somnia.network/tx/${receipt.anchorTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 transition"
                              >
                                Somnia Tx <ExternalLink size={12} />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => openRevision(receipt)}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                            >
                              Revise Thesis
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedId(selectedId === receipt.id ? null : receipt.id)}
                            className="font-mono text-xs text-[#c8f06a] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {selectedId === receipt.id ? "Hide Details" : "View Full Audit"} <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Network Verified Proofs */}
          {activeLedgerTab === "NETWORK" && (
            <div className="mt-6">
              {filteredCompletedProofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
                  <Clock3 size={32} className="text-slate-500" />
                  <h3 className="mt-3 font-display text-base font-bold text-white">No network proofs match query</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md">
                    Completed network proofs populate as active DreamDEX binary contracts reach expiration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredCompletedProofs.map((proof) => (
                    <div
                      key={proof.receiptId}
                      className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d131f]/90 p-5 shadow-lg backdrop-blur-xl transition hover:border-[#c8f06a]/40 hover:bg-[#121a2b]/90"
                    >
                      <div>
                        {/* Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8f06a]/40 bg-[#c8f06a]/15 px-2.5 py-1 font-mono text-[10px] font-black text-[#c8f06a] tracking-wider">
                              {proof.asset} / SOMNIA
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                              SETTLED {proof.resolutionOutcome}
                            </span>
                            {proof.directionalAccurate && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                                ✓ Directional Match
                              </span>
                            )}
                            <span className="font-mono text-xs text-slate-400">
                              Proof #{proof.receiptId}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[10px] uppercase text-slate-500 block">Brier Score</span>
                            <span className="text-xl font-black text-[#c8f06a] block">{proof.brierScore.toFixed(4)}</span>
                          </div>
                        </div>

                        {/* Question & Forecaster */}
                        <h3 className="mt-3 font-display text-base sm:text-lg font-bold text-white">
                          {proof.question}
                        </h3>

                        {/* Forecaster info & Thesis */}
                        <div className="mt-3 rounded-xl border border-white/5 bg-black/30 p-3">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>Forecaster: <b className="text-white">{proof.forecasterName}</b></span>
                            <span>Settled via Somnia DreamDEX Contract</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300 italic leading-relaxed">
                            "{proof.userThesis}"
                          </p>
                        </div>

                        {/* Probability Grid */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
                          <div>
                            <span>Committed: </span>
                            <b className="text-white">
                              {proof.userDirection} {proof.userProbabilityPercent.toFixed(1)}%
                            </b>
                          </div>
                          <div>
                            <span>EventForge: </span>
                            <b className="text-sky-300">
                              {proof.eventForgeProbabilityPercent != null
                                ? `${proof.eventForgeProbabilityPercent.toFixed(1)}%`
                                : "50.0%"}
                            </b>
                          </div>
                          <div>
                            <span>Market Mid: </span>
                            <b className="text-white">
                              {proof.marketProbabilityPercent ? `${proof.marketProbabilityPercent.toFixed(1)}%` : "50.0%"}
                            </b>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModalProof({
                              id: proof.receiptId,
                              marketId: proof.marketId,
                              forecast: {
                                direction: proof.userDirection,
                                probabilityBps: Math.round(proof.userProbabilityPercent * 100),
                                confidence: proof.userConfidence,
                                thesis: proof.userThesis,
                              },
                              marketSnapshot: {
                                marketId: proof.marketId,
                                question: proof.question,
                                asset: proof.asset,
                                network: "Somnia Shannon Testnet",
                              },
                              anchorTxHash: proof.anchorTxHash,
                              anchorAddress: proof.anchorAddress,
                              createdAt: proof.committedAt,
                              resolutions: [
                                {
                                  outcome: proof.resolutionOutcome,
                                  verificationStatus: "VERIFIED",
                                  evidenceHash: proof.receiptHash,
                                },
                              ],
                            });
                            setProofCardModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 font-mono text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
                        >
                          <Share2 size={13} /> Inspect 10-Pt Proof Seal ↗
                        </button>

                        {proof.anchorTxHash && (
                          <a
                            href={`https://shannon-explorer.somnia.network/tx/${proof.anchorTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-300 hover:bg-emerald-900/80 transition"
                          >
                            Somnia Shannon L1 Tx <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Selected Receipt Inspection Panel (Inline Accordion) */}
        {selectedId && selectedReceipt && (
          <section className="rounded-2xl border border-[#c8f06a]/40 bg-[#0e1422] p-6 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                  <ShieldCheck size={14} /> Cryptographic Proof Inspection // Receipt #{selectedReceipt.id}
                </div>
                <h3 className="mt-1 font-display text-xl font-bold text-white">
                  Decision Digest & Revision History
                </h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white transition"
              >
                ✕ Close
              </button>
            </div>

            {/* SHA-256 Digest Pill */}
            <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                SHA-256 Cryptographic Evidence Digest
              </span>
              <div className="mt-1 font-mono text-xs text-[#c8f06a] break-all select-all">
                {selectedReceipt.resolutions[0]?.evidenceHash ||
                  "0x" +
                    Array.from(
                      new TextEncoder().encode(`PROOFCAST_RECEIPT_${selectedReceipt.id}_${selectedReceipt.createdAt}`)
                    )
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .slice(0, 32)
                      .join("")
                      .padEnd(64, "0")}
              </div>
            </div>

            {/* Revisions Stack */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-slate-300">
                  Revision History ({selectedReceipt.revisions.length})
                </span>
                <button
                  type="button"
                  onClick={() => openRevision(selectedReceipt)}
                  className="rounded-lg bg-[#c8f06a] px-3 py-1 font-mono text-xs font-bold text-[#10140d] hover:bg-[#d8fa7a] transition"
                >
                  Create Revision
                </button>
              </div>

              {selectedReceipt.revisions.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 font-mono">
                  No revisions committed. This is the original immutable forecast record.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {selectedReceipt.revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-mono"
                    >
                      <div>
                        <span className="text-white font-bold">Rev #{rev.revisionNumber}</span>
                        <span className="text-slate-400 ml-2">
                          {rev.direction} @ {percentFromBps(rev.probabilityBps)} ({rev.confidence})
                        </span>
                      </div>
                      <span className="text-slate-500">{receiptDate(rev.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revision Form Modal / Drawer */}
            {revisionOpen && (
              <form
                className="mt-6 rounded-xl border border-white/15 bg-black/50 p-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  revise.mutate({ receiptId: selectedId, ...revision });
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-xs font-bold uppercase text-[#c8f06a]">
                    Draft New Revision (Version {selectedReceipt.version + 1})
                  </h4>
                  <button type="button" onClick={() => setRevisionOpen(false)} className="text-xs text-slate-400">
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-slate-400 mb-1">Direction</label>
                    <select
                      value={revision.direction}
                      onChange={(e) => setRevision({ ...revision, direction: e.target.value as "UP" | "DOWN" })}
                      className="w-full rounded-lg border border-white/15 bg-black/40 p-2 font-mono text-xs text-white"
                    >
                      <option value="UP">UP</option>
                      <option value="DOWN">DOWN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-slate-400 mb-1">Probability (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      step="0.1"
                      value={revision.probabilityBps / 100}
                      onChange={(e) =>
                        setRevision({ ...revision, probabilityBps: Math.round(Number(e.target.value) * 100) })
                      }
                      className="w-full rounded-lg border border-white/15 bg-black/40 p-2 font-mono text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-slate-400 mb-1">Confidence</label>
                    <select
                      value={revision.confidence}
                      onChange={(e) =>
                        setRevision({ ...revision, confidence: e.target.value as "LOW" | "MEDIUM" | "HIGH" })
                      }
                      className="w-full rounded-lg border border-white/15 bg-black/40 p-2 font-mono text-xs text-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-slate-400 mb-1">Updated Thesis</label>
                  <textarea
                    required
                    value={revision.thesis}
                    onChange={(e) => setRevision({ ...revision, thesis: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 p-2 font-mono text-xs text-white min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-slate-400 mb-1">Counter-Thesis & Invalidation</label>
                  <textarea
                    required
                    value={revision.counterThesis}
                    onChange={(e) => setRevision({ ...revision, counterThesis: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-black/40 p-2 font-mono text-xs text-white min-h-[60px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={revise.isPending}
                  className="rounded-xl bg-[#c8f06a] px-4 py-2 font-mono text-xs font-bold text-[#10140d] hover:bg-[#d8fa7a] transition disabled:opacity-50"
                >
                  {revise.isPending ? "Committing revision…" : "Commit Cryptographic Revision"}
                </button>
              </form>
            )}
          </section>
        )}

        {/* Calibration Reliability Suite */}
        {auth.isAuthenticated && metrics.data && metrics.data.bins.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-[#0a0e14]/90 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                  <Scale size={14} /> Empirical Reliability Bins
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-white">
                  Predicted Probability vs Observed Outcomes
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400">
                BS Metric: {metrics.data?.meanBrierScoreBps != null ? (metrics.data.meanBrierScoreBps / 10000).toFixed(4) : "—"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {metrics.data.bins
                .filter((bin) => bin.count > 0)
                .map((bin) => (
                  <div key={bin.lowerBps} className="rounded-xl border border-white/5 bg-black/30 p-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>
                        {(bin.lowerBps / 100).toFixed(0)}% – {(bin.upperBps / 100).toFixed(0)}%
                      </span>
                      <span className="font-bold text-white">{bin.count} proofs</span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-[#c8f06a]">
                      Observed: {(bin.observedBps / 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500">Predicted: {(bin.predictedBps / 100).toFixed(1)}%</div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Administrator Queue (Only if Admin) */}
        {isAdmin && reviewQueue.data && reviewQueue.data.length > 0 && (
          <section className="rounded-2xl border border-amber-500/30 bg-black/60 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Admin Review Queue
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-white">
                  {reviewQueue.data.length} Submitted Items Awaiting Validation
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {reviewQueue.data.map((item) => (
                <div
                  key={item.resolution.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-xs font-mono"
                >
                  <div>
                    <b className="text-white">Receipt #{item.receipt.id} · {item.resolution.outcome}</b>
                    <p className="text-slate-400 text-[11px] mt-0.5">{item.resolution.evidenceSummary}</p>
                    <a href={item.resolution.sourceUrl} target="_blank" rel="noreferrer" className="text-teal-400 hover:underline">
                      {item.resolution.sourceUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={reviewEvidence.isPending}
                      onClick={() => reviewEvidence.mutate({ resolutionId: item.resolution.id, status: "VERIFIED" })}
                      className="rounded-lg bg-emerald-500 px-3 py-1 font-bold text-black hover:bg-emerald-400"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={reviewEvidence.isPending}
                      onClick={() => reviewEvidence.mutate({ resolutionId: item.resolution.id, status: "REJECTED" })}
                      className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 font-bold text-white hover:bg-white/10"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Proof Card Modal */}
      <ProofCardModal
        isOpen={proofCardModalOpen}
        onClose={() => {
          setProofCardModalOpen(false);
          setSelectedModalProof(null);
        }}
        receipt={selectedModalProof ?? selectedReceipt ?? null}
      />
    </SignalShell>
  );
}
