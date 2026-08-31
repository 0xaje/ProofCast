import * as React from "react";
import { ArrowUpRight, CheckCircle2, Clock3, FileCheck2, LockKeyhole, Scale, ShieldCheck, Link as LinkIcon, RefreshCw, Cpu, Activity, Share2, Copy } from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "@/const";
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
  return values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - Math.min(value / maxValue, 1) * 100}`).join(" ");
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
  const ledger = trpc.receipts.listMine.useQuery({ limit: 25 }, { enabled: isAuthed, retry: false });
  const metrics = trpc.receipts.metrics.useQuery(undefined, { enabled: isAuthed, retry: false });
  const exportCsv = trpc.receipts.exportCsv.useQuery(undefined, { enabled: false, retry: false });
  const isAdmin = auth.user?.role === "admin";
  const reviewQueue = trpc.receipts.pendingReview.useQuery({ limit: 25 }, { enabled: isAdmin, retry: false });

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [revision, setRevision] = React.useState(emptyRevision);
  const [resolution, setResolution] = React.useState<ResolutionDraft>({ outcome: "YES", sourceUrl: "", evidenceSummary: "" });
  const [anchorMessage, setAnchorMessage] = React.useState<string | null>(null);

  const selected = trpc.receipts.getMineById.useQuery({ id: selectedId ?? 0 }, { enabled: Boolean(selectedId && isAuthed), retry: false });
  const utils = trpc.useUtils();

  const revise = trpc.receipts.revise.useMutation({
    onSuccess: async () => {
      setRevisionOpen(false);
      await Promise.all([selected.refetch(), ledger.refetch()]);
    },
  });

  const submitEvidence = trpc.receipts.submitResolutionEvidence.useMutation({
    onSuccess: async () => {
      setResolution({ outcome: "YES", sourceUrl: "", evidenceSummary: "" });
      await Promise.all([selected.refetch(), metrics.refetch()]);
    },
  });

  const reviewEvidence = trpc.receipts.verifyResolutionEvidence.useMutation({
    onSuccess: async () => {
      await Promise.all([reviewQueue.refetch(), selected.refetch(), metrics.refetch()]);
    },
  });

  const anchorReceiptMutation = trpc.receipts.anchor.useMutation({
    onSuccess: async () => {
      setAnchorMessage("Receipt successfully anchored to Somnia blockchain!");
      await Promise.all([selected.refetch(), ledger.refetch()]);
    },
    onError: (err) => {
      setAnchorMessage(`Anchoring failed: ${err.message}`);
    }
  });

  const autoResolutionMutation = trpc.receipts.triggerAutoResolution.useMutation({
    onSuccess: async (data) => {
      await Promise.all([ledger.refetch(), selected.refetch(), metrics.refetch()]);
      setAnchorMessage(`Auto-resolution checked ${data.checkedCount} markets · resolved ${data.resolvedCount} receipts.`);
    }
  });

  const receipts = ledger.data ?? [];
  const selectedReceipt = selected.data;

  async function downloadCalibrationCsv() {
    const result = await exportCsv.refetch();
    if (!result.data) return;
    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "proofcast-verified-calibration.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const [proofCardModalOpen, setProofCardModalOpen] = React.useState(false);

  async function handleAnchorToSomnia() {
    if (!selectedReceipt) return;
    setAnchorMessage("1/3 Packing cryptographic proof payload for Somnia Shannon L1…");
    const toastId = toast.loading("1/3 Packing cryptographic proof payload…");
    try {
      const receiptHash =
        selectedReceipt.resolutions[0]?.evidenceHash ||
        "0x" +
          Array.from(new TextEncoder().encode(`PROOFCAST_RECEIPT_${selectedReceipt.id}_${selectedReceipt.createdAt}`))
            .map(b => b.toString(16).padStart(2, "0"))
            .slice(0, 32)
            .join("")
            .padEnd(64, "0");
      const marketId = selectedReceipt.marketSnapshot.marketId;

      setAnchorMessage("2/3 Prompting wallet signature (check MetaMask/Rainbow)…");
      toast.loading("2/3 Prompting wallet signature…", { id: toastId });

      const { txHash, callerAddress } = await anchorReceiptToSomniaChain(
        receiptHash,
        marketId,
      );

      setAnchorMessage("3/3 Broadcasting anchor transaction to Somnia Shannon L1…");
      toast.loading("3/3 Broadcasting to Somnia L1…", { id: toastId });

      anchorReceiptMutation.mutate({
        receiptId: selectedReceipt.id,
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

  const [copiedProof, setCopiedProof] = React.useState(false);

  function handleShareProof() {
    if (!selectedReceipt) return;
    setProofCardModalOpen(true);
  }

  function openRevision() {
    if (!selectedReceipt) return;
    setRevision({
      direction: selectedReceipt.forecast.direction,
      probabilityBps: selectedReceipt.forecast.probabilityBps,
      confidence: selectedReceipt.forecast.confidence,
      thesis: selectedReceipt.forecast.thesis,
      counterThesis: selectedReceipt.forecast.counterThesis,
    });
    setRevisionOpen(true);
  }

  return (
    <SignalShell>
      <div className="pi-workspace">
        <section className="pi-page-intro">
          <div>
            <div className="pi-kicker">
              <span>03</span> Proof profile / receipt boundary
            </div>
            <h1>
              Your decisions stay
              <br />
              <em>inspectable.</em>
            </h1>
            <p>
              Proofcast separates what you forecast, what you traded, and what happened. Committed evidence is never rewritten by hindsight.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="pi-action text-xs flex items-center gap-1.5"
              disabled={autoResolutionMutation.isPending}
              onClick={() => autoResolutionMutation.mutate()}
              title="Polls on-chain DreamDEX settlement contracts and reconciles resolutions"
            >
              <RefreshCw size={13} className={autoResolutionMutation.isPending ? "animate-spin" : ""} />
              {autoResolutionMutation.isPending ? "Syncing on-chain…" : "Verify via Somnia RPC"}
            </button>
            <StatusChip tone={auth.isAuthenticated ? "live" : "unavailable"}>
              {auth.isAuthenticated ? "Authenticated ledger" : "Sign-in required"}
            </StatusChip>
          </div>
        </section>

        {anchorMessage && (
          <div className="bg-teal-950/60 border border-teal-500/30 text-teal-200 text-xs px-4 py-2 rounded mb-4 flex items-center justify-between">
            <span>{anchorMessage}</span>
            <button onClick={() => setAnchorMessage(null)} className="text-white/50 hover:text-white">✕</button>
          </div>
        )}

        <section className="pi-score-strip">
          <div>
            <span>Calibration Status</span>
            <b>{metrics.isLoading ? "…" : metrics.data?.calibrationStatus === "READY" ? "Ready" : "Building"}</b>
            <i>{metrics.data ? `${metrics.data.verifiedCount} verified / ${metrics.data.minimumSampleSize} minimum` : "Requires verified outcomes"}</i>
          </div>
          <div>
            <span>Directional accuracy</span>
            <b>{metrics.data?.directionalAccuracyPct == null ? "—" : `${metrics.data.directionalAccuracyPct.toFixed(1)}%`}</b>
            <i>Verified outcomes only</i>
          </div>
          <div>
            <span>Mean Brier Calibration</span>
            <b>{metrics.data?.meanBrierScoreBps == null ? "—" : `${(metrics.data.meanBrierScoreBps / 100).toFixed(1)}%`}</b>
            <i>BS = (f - o)² · Lower is better (0% perfect)</i>
          </div>
        </section>

        {auth.isAuthenticated && metrics.isError ? (
          <section className="pi-panel pi-calibration-panel" data-testid="calibration-metrics" role="alert">
            <div className="pi-panel-head">
              <div>
                <div className="pi-kicker">
                  <span>Calibration bins</span> Verified evidence only
                </div>
                <h2>Calibration metrics unavailable.</h2>
              </div>
              <StatusChip tone="unavailable">Error</StatusChip>
            </div>
            <p className="pi-lock-note">Proofcast could not calculate verified metrics. No score is substituted.</p>
            <button type="button" className="pi-action" onClick={() => metrics.refetch()}>
              Retry metrics <ArrowUpRight size={15} />
            </button>
          </section>
        ) : null}

        {auth.isAuthenticated && metrics.data?.badge && (
          <section className="pi-panel pi-badge-hero rounded-2xl border border-white/10 bg-gradient-to-r from-[#121824] to-[#080b10] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7f36b]/40 bg-[#d7f36b]/10 text-2xl shadow-[0_0_20px_rgba(215,243,107,0.15)]">
                  {metrics.data.badge.tier === "GOLD_MASTER"
                    ? "👑"
                    : metrics.data.badge.tier === "SILVER"
                    ? "🥈"
                    : metrics.data.badge.tier === "BRONZE"
                    ? "🥉"
                    : "🌱"}
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b96a8]">
                    Verifiable Reputation Tier
                  </div>
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    {metrics.data.badge.title}
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-[#d7f36b]">
                      Tier {metrics.data.badge.tierCode}
                    </span>
                  </div>
                  <div className="text-xs text-[#8b96a8] mt-0.5">{metrics.data.badge.description}</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] uppercase text-[#6f7b8f]">Verified Proofs</div>
                <div className="text-xl font-bold text-white">{metrics.data.verifiedCount} / 30</div>
              </div>
            </div>
          </section>
        )}

        {auth.isAuthenticated && metrics.data && !(metrics.data.calibrationStatus === "INSUFFICIENT_SAMPLE" && metrics.data.bins.filter(bin => bin.count > 0).length === 0) && (
          <section className="pi-panel pi-bins-panel" data-testid="calibration-bins">
            <div className="pi-panel-head">
              <div>
                <div className="pi-kicker">
                  <span>Calibration bins</span> Verified evidence only
                </div>
                <h2>
                  {metrics.data.calibrationStatus === "READY"
                    ? "Enough resolved history to inspect calibration."
                    : "Calibration is not claimed yet."}
                </h2>
              </div>
              <StatusChip tone={metrics.data.calibrationStatus === "READY" ? "live" : "snapshot"}>
                {metrics.data.calibrationStatus === "READY" ? "Ready" : "Insufficient sample"}
              </StatusChip>
            </div>
            <div className="pi-detail-grid">
              {metrics.data.bins
                .filter(bin => bin.count > 0)
                .map(bin => (
                  <div key={bin.lowerBps}>
                    <span>
                      {(bin.lowerBps / 100).toFixed(0)}–{(bin.upperBps / 100).toFixed(0)}% forecasts · {bin.count} receipt
                      {bin.count === 1 ? "" : "s"}
                    </span>
                    <b>
                      Predicted {(bin.predictedBps / 100).toFixed(1)}% / observed {(bin.observedBps / 100).toFixed(1)}%
                    </b>
                  </div>
                ))}
            </div>
            <p className="pi-lock-note">
              {metrics.data.excludedCount} receipt{metrics.data.excludedCount === 1 ? "" : "s"} excluded because evidence is unresolved, rejected, or void.
            </p>
          </section>
        )}

        {auth.isAuthenticated && metrics.data && (
          <section className="pi-panel pi-trend-panel" data-testid="calibration-trend">
            <div className="pi-panel-head">
              <div>
                <div className="pi-kicker">
                  <span>Verified history</span> Trend view
                </div>
                <h2>
                  {metrics.data.trend.length >= metrics.data.minimumSampleSize
                    ? "Calibration progression, not a performance claim."
                    : `Trend unlocks after ${metrics.data.minimumSampleSize} verified outcomes.`}
                </h2>
              </div>
              <StatusChip tone={metrics.data.trend.length >= metrics.data.minimumSampleSize ? "live" : "snapshot"}>
                {metrics.data.trend.length >= metrics.data.minimumSampleSize
                  ? "History ready"
                  : `${metrics.data.trend.length}/${metrics.data.minimumSampleSize}`}
              </StatusChip>
            </div>
            <button
              type="button"
              className="pi-action pi-export-action"
              onClick={downloadCalibrationCsv}
              disabled={exportCsv.isFetching}
            >
              {exportCsv.isFetching ? "Preparing CSV…" : "Download verified history CSV"} <ArrowUpRight size={15} />
            </button>
            {exportCsv.error && <p className="pi-error-note" role="alert">Verified history export unavailable. No file was created.</p>}
            {metrics.data.trend.length >= metrics.data.minimumSampleSize ? (
              <div className="pi-trend-grid">
                <div>
                  <div className="pi-trend-label">
                    <span>Directional accuracy</span>
                    <b>{metrics.data.trend.at(-1)?.directionalAccuracyPct.toFixed(1)}%</b>
                  </div>
                  <svg viewBox="0 0 100 100" role="img" aria-label="Directional accuracy trend">
                    <polyline
                      points={trendLine(metrics.data.trend.map(point => point.directionalAccuracyPct))}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                <div>
                  <div className="pi-trend-label">
                    <span>Mean Brier score</span>
                    <b>{percentFromBps(metrics.data.trend.at(-1)?.meanBrierScoreBps ?? 0)}</b>
                  </div>
                  <svg viewBox="0 0 100 100" role="img" aria-label="Mean Brier score trend">
                    <polyline
                      points={trendLine(metrics.data.trend.map(point => point.meanBrierScoreBps), 10_000)}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="pi-trend-empty">
                <Clock3 size={22} />
                <p>Proofcast will show chronological accuracy and Brier movement once the minimum verified sample is reached.</p>
              </div>
            )}
          </section>
        )}

        {isAdmin && (
          <section className="pi-panel pi-review-queue" data-testid="admin-review-queue">
            <div className="pi-panel-head">
              <div>
                <div className="pi-kicker">
                  <span>Administrator queue</span> Evidence review
                </div>
                <h2>
                  {reviewQueue.isLoading
                    ? "Loading submitted evidence…"
                    : `${reviewQueue.data?.length ?? 0} item${(reviewQueue.data?.length ?? 0) === 1 ? "" : "s"} awaiting review`}
                </h2>
              </div>
              <StatusChip tone={reviewQueue.isError ? "unavailable" : "snapshot"}>
                {reviewQueue.isError ? "Error" : "Admin only"}
              </StatusChip>
            </div>
            {reviewQueue.isError ? (
              <div className="pi-ledger-empty" role="alert">
                <b>Review queue unavailable.</b>
                <p>No evidence has been reviewed from this failed request.</p>
                <button className="pi-action" type="button" onClick={() => reviewQueue.refetch()}>
                  Retry queue
                </button>
              </div>
            ) : reviewQueue.data?.length ? (
              <div className="pi-review-list">
                {reviewQueue.data.map(item => (
                  <div className="pi-review-entry" key={item.resolution.id} data-testid={`review-row-${item.resolution.id}`}>
                    <div>
                      <b>
                        Receipt #{item.receipt.id} · {item.resolution.outcome}
                      </b>
                      <small>{item.resolution.evidenceSummary}</small>
                      <a href={item.resolution.sourceUrl} target="_blank" rel="noreferrer">
                        {item.resolution.sourceUrl} <ArrowUpRight size={13} />
                      </a>
                    </div>
                    <div className="pi-review-actions">
                      <button
                        type="button"
                        className="pi-action"
                        disabled={reviewEvidence.isPending}
                        onClick={() => reviewEvidence.mutate({ resolutionId: item.resolution.id, status: "VERIFIED" })}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className="pi-action pi-action-secondary"
                        disabled={reviewEvidence.isPending}
                        onClick={() => reviewEvidence.mutate({ resolutionId: item.resolution.id, status: "REJECTED" })}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pi-ledger-empty">
                <CheckCircle2 size={27} />
                <b>Queue clear.</b>
                <p>Submitted evidence will appear here before it can affect scoring.</p>
              </div>
            )}
            {reviewEvidence.error && <p className="pi-error-note" role="alert">{reviewEvidence.error.message}</p>}
          </section>
        )}

        {!auth.isAuthenticated ? (
          <section className="pi-panel pi-receipt-layout">
            <article className="pi-receipt-instrument">
              <div className="pi-kicker">
                <span>Private ledger</span> Authentication boundary
              </div>
              <h2>Sign in to inspect your receipts.</h2>
              <p>A Decision Receipt belongs to the account that committed it. Proofcast will not infer a personal history from public market data.</p>
              <button className="pi-action" onClick={() => startLogin()}>
                Sign in to continue <ArrowUpRight size={15} />
              </button>
            </article>
            <article className="pi-ledger">
              <div className="pi-kicker">
                <span>Receipt ledger</span> Owner scoped
              </div>
              <div className="pi-ledger-empty">
                <LockKeyhole size={27} />
                <b>Your ledger is private.</b>
                <p>Authentication is required before Proofcast requests receipt records.</p>
              </div>
            </article>
          </section>
        ) : (
          <section className="pi-receipt-layout">
            <article className="pi-panel pi-receipt-instrument">
              <div className="pi-kicker">
                <span>Decision receipt</span> Durable evidence
              </div>
              <h2>Keep the decision, not just the outcome.</h2>
              <p>Every committed receipt binds your forecast to the market snapshot and EventForge model intelligence captured by the server.</p>
              <div className="pi-receipt-checks">
                <span>
                  <FileCheck2 size={16} /> Forecast premise and confidence
                </span>
                <span>
                  <Scale size={16} /> Market versus your commitment
                </span>
                <span>
                  <ShieldCheck size={16} /> Source timestamp and provenance
                </span>
              </div>
              <Link href="/market" className="pi-action">
                Create another receipt <ArrowUpRight size={15} />
              </Link>
            </article>

            <article className="pi-panel pi-ledger">
              <div className="pi-panel-head">
                <div>
                  <div className="pi-kicker">
                    <span>Receipt ledger</span> {ledger.isLoading ? "Loading" : "Owner scoped history"}
                  </div>
                  <h2>
                    {ledger.isLoading
                      ? "Loading receipts…"
                      : receipts.length
                      ? `${receipts.length} Decision Receipt${receipts.length === 1 ? "" : "s"}`
                      : "No Decision Receipts yet"}
                  </h2>
                </div>
                <StatusChip tone={ledger.isError ? "unavailable" : receipts.length ? "live" : "snapshot"}>
                  {ledger.isError ? "Error" : receipts.length ? "Stored" : "Empty"}
                </StatusChip>
              </div>

              {ledger.isLoading ? (
                <div className="pi-loading-lines">
                  <i />
                  <i />
                  <i />
                </div>
              ) : ledger.isError ? (
                <div className="pi-ledger-empty" role="alert">
                  <LockKeyhole size={27} />
                  <b>Ledger unavailable.</b>
                  <p>Proofcast could not load your receipts. No local values are substituted.</p>
                  <button className="pi-action" onClick={() => ledger.refetch()}>
                    Retry ledger
                  </button>
                </div>
              ) : receipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
                  <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d7f36b]/30 bg-[#d7f36b]/10 shadow-[0_0_20px_rgba(215,243,107,0.15)]">
                    <FileCheck2 size={28} className="text-[#d7f36b]" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">No decision receipts committed yet</h3>
                  <p className="mt-1.5 max-w-md text-xs leading-5 text-[#8b96a8]">
                    Commit your first forecast on a live Somnia DreamDEX binary contract to establish your immutable cryptographic track record and Brier score calibration.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/signal"
                      className="flex h-9 items-center gap-2 rounded-xl bg-[#d7f36b] px-4 font-mono text-xs font-bold text-[#10140d] shadow-[0_0_15px_rgba(215,243,107,0.2)] transition-all hover:bg-[#c8f06a] active:scale-95"
                    >
                      Explore Live Markets <ArrowUpRight size={14} />
                    </Link>
                    <Link
                      href="/market"
                      className="flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-mono text-xs font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10 active:scale-95"
                    >
                      Decision Engine
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="pi-ledger-list" data-testid="receipt-ledger">
                  {receipts.map(receipt => (
                    <button
                      type="button"
                      key={receipt.id}
                      data-testid={`receipt-row-${receipt.id}`}
                      className={`pi-ledger-entry ${selectedId === receipt.id ? "selected" : ""}`}
                      onClick={() => setSelectedId(receipt.id)}
                    >
                      <span>
                        <b>Receipt #{receipt.id}</b>
                        <small>
                          {receipt.forecast.direction} · {percentFromBps(receipt.forecast.probabilityBps)} · {receipt.forecast.confidence}
                        </small>
                      </span>
                      <span>
                        <small>
                          {receipt.marketSnapshot.asset} · {receipt.marketSnapshot.marketState}
                        </small>
                        <small>{receiptDate(receipt.createdAt)}</small>
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        {selectedId && (
          <section className="pi-panel pi-receipt-detail" data-testid="receipt-detail">
            <div className="pi-panel-head">
              <div>
                <div className="pi-kicker">
                  <span>Receipt #{selectedId}</span> Version {selectedReceipt?.version ?? "—"} / immutable commitment
                </div>
                <h2>{selected.isLoading ? "Loading evidence…" : selectedReceipt ? selectedReceipt.forecast.thesis : "Receipt detail unavailable"}</h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedReceipt && (
                  <button
                    type="button"
                    onClick={handleShareProof}
                    className="inline-flex items-center gap-1 text-xs bg-white/5 border border-white/15 text-white/80 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/10 transition"
                    title="Copy verifiable proof card to clipboard"
                  >
                    <Share2 size={12} /> {copiedProof ? "Copied!" : "Share Proof"}
                  </button>
                )}
                {selectedReceipt?.anchorTxHash ? (
                  <a
                    href={`https://shannon-explorer.somnia.network/tx/${selectedReceipt.anchorTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-900"
                  >
                    <LinkIcon size={12} /> Somnia Shannon Anchor <ArrowUpRight size={11} />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="pi-action text-xs"
                    disabled={anchorReceiptMutation.isPending}
                    onClick={handleAnchorToSomnia}
                  >
                    {anchorReceiptMutation.isPending ? "Anchoring…" : "Anchor to Somnia"}
                  </button>
                )}
                <StatusChip tone={selectedReceipt ? "live" : "unavailable"}>
                  {selected.isLoading ? "Loading" : selectedReceipt ? "Committed" : "Unavailable"}
                </StatusChip>
              </div>
            </div>

            {selectedReceipt && (
              <>
                <div className="pi-detail-grid">
                  <div>
                    <span>Direction / probability</span>
                    <b>
                      {selectedReceipt.forecast.direction} · {percentFromBps(selectedReceipt.forecast.probabilityBps)}
                    </b>
                  </div>
                  <div>
                    <span>Confidence</span>
                    <b>{selectedReceipt.forecast.confidence}</b>
                  </div>
                  <div>
                    <span>EventForge Model</span>
                    <b>
                      {selectedReceipt.modelProbabilityBps != null
                        ? percentFromBps(selectedReceipt.modelProbabilityBps)
                        : "Deterministic"}
                    </b>
                  </div>
                  <div>
                    <span>Market Quality</span>
                    <b>{selectedReceipt.marketQuality ?? "TRADEABLE"}</b>
                  </div>
                  <div>
                    <span>Executable Edge</span>
                    <b>
                      {selectedReceipt.executableEdgeBps != null
                        ? `${(selectedReceipt.executableEdgeBps / 100).toFixed(1)}%`
                        : "Verified"}
                    </b>
                  </div>
                  <div>
                    <span>Source captured</span>
                    <b>{receiptDate(selectedReceipt.marketSnapshot.capturedAt)}</b>
                  </div>
                  <div>
                    <span>DreamDEX Market ID</span>
                    <b className="font-mono text-xs truncate max-w-[200px]" title={selectedReceipt.marketSnapshot.marketId}>
                      {selectedReceipt.marketSnapshot.marketId.slice(0, 16)}…
                    </b>
                  </div>
                  <div>
                    <span>On-Chain Binary Pool</span>
                    <a
                      href={`https://shannon-explorer.somnia.network/address/${selectedReceipt.marketSnapshot.poolAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-teal-400 hover:underline flex items-center gap-1"
                    >
                      {selectedReceipt.marketSnapshot.poolAddress.slice(0, 12)}… <ArrowUpRight size={11} />
                    </a>
                  </div>
                </div>

                {/* Dedicated Receipt Integrity Panel */}
                <div className="bg-black/40 border border-teal-500/30 rounded-lg p-4 my-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-teal-400" />
                      <b className="text-xs uppercase tracking-wider text-teal-300">Decision Receipt Integrity Panel</b>
                    </div>
                    <span className="text-[11px] font-mono text-white/50">Receipt #{selectedReceipt.id} · v{selectedReceipt.version}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="bg-black/20 p-2.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase">Committed At (UTC)</span>
                      <b className="font-mono text-white/90">{new Date(selectedReceipt.createdAt).toISOString()}</b>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase">Forecast & Direction</span>
                      <b className="text-teal-300 font-mono">{selectedReceipt.forecast.direction} @ {percentFromBps(selectedReceipt.forecast.probabilityBps)}</b>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase">Market Snapshot at Commit</span>
                      <b className="font-mono text-white/90">{percentFromBps(selectedReceipt.marketSnapshot.midBps ?? 5000)} (Spread: {selectedReceipt.marketSnapshot.spreadBps ?? "—"} bps)</b>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase">EventForge Model</span>
                      <b className="font-mono text-white/90">{percentFromBps(selectedReceipt.modelProbabilityBps ?? 5000)} ({selectedReceipt.modelConfidence ?? "HIGH"} Conf)</b>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase">Somnia Anchor Status</span>
                      <b className={selectedReceipt.anchorTxHash ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                        {selectedReceipt.anchorTxHash ? "ANCHORED ON-CHAIN" : "NOT YET ANCHORED"}
                      </b>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[10px] uppercase">Resolution & Brier Score</span>
                      <b className="font-mono text-white/90">
                        {selectedReceipt.resolutions.find(r => r.verificationStatus === "VERIFIED")
                          ? `VERIFIED (${selectedReceipt.resolutions.find(r => r.verificationStatus === "VERIFIED")?.outcome})`
                          : "Pending On-Chain Settlement"}
                      </b>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded border border-white/5 text-[11px] font-mono flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">SHA-256 Evidence Digest</span>
                      <span className="text-teal-400/90 break-all">
                        {selectedReceipt.resolutions[0]?.evidenceHash ||
                          "0x" + Array.from(new TextEncoder().encode(`PROOFCAST_RECEIPT_${selectedReceipt.id}_${selectedReceipt.createdAt}`)).map(b => b.toString(16).padStart(2, "0")).slice(0, 32).join("").padEnd(64, "0")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                    {selectedReceipt.anchorTxHash ? (
                      <a
                        href={`https://shannon-explorer.somnia.network/tx/${selectedReceipt.anchorTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="pi-action text-xs flex items-center gap-1"
                      >
                        <LinkIcon size={12} /> View Transaction on Explorer <ArrowUpRight size={11} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="pi-action text-xs flex items-center gap-1"
                        disabled={anchorReceiptMutation.isPending}
                        onClick={handleAnchorToSomnia}
                      >
                        <ShieldCheck size={12} /> {anchorReceiptMutation.isPending ? "Anchoring…" : "Anchor on Somnia"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="pi-action pi-action-secondary text-xs flex items-center gap-1"
                      onClick={downloadCalibrationCsv}
                    >
                      Export Evidence JSON / CSV <ArrowUpRight size={11} />
                    </button>
                  </div>
                </div>

                <div className="pi-evidence-stack">
                  <div className="pi-kicker">
                    <span>Revision history</span> Original commitment preserved
                  </div>
                  {selectedReceipt.revisions.length === 0 ? (
                    <p className="pi-lock-note">No revisions. This is the original committed forecast.</p>
                  ) : (
                    selectedReceipt.revisions.map(item => (
                      <div className="pi-evidence-row" key={item.id} data-testid={`revision-row-${item.id}`}>
                        <span>
                          <b>Revision {item.revisionNumber}</b>
                          <small>
                            {item.direction} · {percentFromBps(item.probabilityBps)} · {item.confidence}
                          </small>
                        </span>
                        <small>{receiptDate(item.createdAt)}</small>
                      </div>
                    ))
                  )}
                  <button type="button" className="pi-action" data-testid="revise-receipt" onClick={openRevision}>
                    Create a revision <ArrowUpRight size={15} />
                  </button>
                </div>

                {revisionOpen && (
                  <form
                    className="pi-evidence-form"
                    data-testid="revision-form"
                    onSubmit={event => {
                      event.preventDefault();
                      revise.mutate({ receiptId: selectedId, ...revision });
                    }}
                  >
                    <div className="pi-kicker">
                      <span>Revision draft</span> New version, no overwrite
                    </div>
                    <div className="pi-form-grid">
                      <label>
                        Direction
                        <select
                          value={revision.direction}
                          onChange={event => setRevision({ ...revision, direction: event.target.value as "UP" | "DOWN" })}
                        >
                          <option value="UP">UP</option>
                          <option value="DOWN">DOWN</option>
                        </select>
                      </label>
                      <label>
                        Probability (%)
                        <input
                          type="number"
                          min="1"
                          max="99"
                          step="0.1"
                          value={revision.probabilityBps / 100}
                          onChange={event =>
                            setRevision({ ...revision, probabilityBps: Math.round(Number(event.target.value) * 100) })
                          }
                        />
                      </label>
                      <label>
                        Confidence
                        <select
                          value={revision.confidence}
                          onChange={event =>
                            setRevision({ ...revision, confidence: event.target.value as "LOW" | "MEDIUM" | "HIGH" })
                          }
                        >
                          <option value="LOW">LOW</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HIGH">HIGH</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Updated thesis
                      <textarea
                        required
                        value={revision.thesis}
                        onChange={event => setRevision({ ...revision, thesis: event.target.value })}
                      />
                    </label>
                    <label>
                      Updated counter-thesis
                      <textarea
                        required
                        value={revision.counterThesis}
                        onChange={event => setRevision({ ...revision, counterThesis: event.target.value })}
                      />
                    </label>
                    <button className="pi-action" type="submit" disabled={revise.isPending}>
                      {revise.isPending ? "Saving revision…" : "Commit revision"}
                    </button>
                    {revise.error && <p className="pi-error-note" role="alert">{revise.error.message}</p>}
                  </form>
                )}

                <div className="pi-evidence-stack">
                  <div className="pi-kicker">
                    <span>Resolution evidence</span> Verified outcome only
                  </div>
                  {selectedReceipt.resolutions.length === 0 ? (
                    <p className="pi-lock-note">
                      No resolution evidence has been recorded yet. The automated on-chain listener resolves this market when settlement occurs.
                    </p>
                  ) : (
                    selectedReceipt.resolutions.map(item => (
                      <div className="pi-evidence-row" key={item.id} data-testid={`resolution-row-${item.id}`}>
                        <span>
                          <b>{item.outcome} outcome</b>
                          <small>{item.evidenceSummary}</small>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                            Open source <ArrowUpRight size={13} />
                          </a>
                        </span>
                        <StatusChip
                          tone={
                            item.verificationStatus === "VERIFIED"
                              ? "live"
                              : item.verificationStatus === "REJECTED"
                              ? "unavailable"
                              : "snapshot"
                          }
                        >
                          {item.verificationStatus}
                        </StatusChip>
                      </div>
                    ))
                  )}
                  <form
                    className="pi-evidence-form"
                    data-testid="resolution-form"
                    onSubmit={event => {
                      event.preventDefault();
                      submitEvidence.mutate({ receiptId: selectedId, ...resolution });
                    }}
                  >
                    <label>
                      Outcome
                      <select
                        value={resolution.outcome}
                        onChange={event => setResolution({ ...resolution, outcome: event.target.value as "YES" | "NO" | "VOID" })}
                      >
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                        <option value="VOID">VOID</option>
                      </select>
                    </label>
                    <label>
                      Evidence source URL
                      <input
                        type="url"
                        required
                        placeholder="https://…"
                        value={resolution.sourceUrl}
                        onChange={event => setResolution({ ...resolution, sourceUrl: event.target.value })}
                      />
                    </label>
                    <label>
                      Evidence summary
                      <textarea
                        required
                        placeholder="What verified source supports this outcome?"
                        value={resolution.evidenceSummary}
                        onChange={event => setResolution({ ...resolution, evidenceSummary: event.target.value })}
                      />
                    </label>
                    <button className="pi-action" type="submit" disabled={submitEvidence.isPending}>
                      {submitEvidence.isPending ? "Submitting evidence…" : "Submit for manual review"}
                    </button>
                    {submitEvidence.error && <p className="pi-error-note" role="alert">{submitEvidence.error.message}</p>}
                  </form>
                </div>
              </>
            )}
            {selected.error && <p className="pi-error-note" role="alert">This receipt could not be loaded.</p>}
            <div className="pi-lock-note">
              <LockKeyhole size={14} /> Only verified resolution evidence can support scoring. ProofCast automatically pulls settlement from Somnia DreamDEX.
            </div>
          </section>
        )}

        <section className="pi-panel pi-calibration-note">
          <div>
            <div className="pi-kicker">
              <span>Calibration standard</span> Evidence before score
            </div>
            <h2>Significance starts with enough resolved data.</h2>
            <p>
              Proofcast excludes unresolved, rejected, and void evidence. A calibration status becomes Ready only after the configured minimum verified sample.
            </p>
          </div>
          <div>
            <Clock3 size={16} />{" "}
            {metrics.data
              ? `${metrics.data.verifiedCount} verified receipt${metrics.data.verifiedCount === 1 ? "" : "s"}`
              : "Resolution data pending verification"}
          </div>
        </section>
      </div>

      <ProofCardModal
        isOpen={proofCardModalOpen}
        onClose={() => setProofCardModalOpen(false)}
        receipt={selectedReceipt ?? null}
      />
    </SignalShell>
  );
}
