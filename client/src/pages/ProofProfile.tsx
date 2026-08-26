import * as React from "react";
import { ArrowUpRight, CheckCircle2, Clock3, FileCheck2, LockKeyhole, Scale, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { SignalShell, StatusChip } from "@/components/SignalShell";
import { trpc } from "@/lib/trpc";

function receiptDate(value: Date | string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function percentFromBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
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
  const ledger = trpc.receipts.listMine.useQuery({ limit: 25 }, { enabled: auth.isAuthenticated, retry: false });
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [revisionOpen, setRevisionOpen] = React.useState(false);
  const [revision, setRevision] = React.useState(emptyRevision);
  const [resolution, setResolution] = React.useState<ResolutionDraft>({ outcome: "YES", sourceUrl: "", evidenceSummary: "" });
  const selected = trpc.receipts.getMineById.useQuery({ id: selectedId ?? 0 }, { enabled: Boolean(selectedId && auth.isAuthenticated), retry: false });
  const revise = trpc.receipts.revise.useMutation({
    onSuccess: async () => {
      setRevisionOpen(false);
      await Promise.all([selected.refetch(), ledger.refetch()]);
    },
  });
  const submitEvidence = trpc.receipts.submitResolutionEvidence.useMutation({
    onSuccess: async () => {
      setResolution({ outcome: "YES", sourceUrl: "", evidenceSummary: "" });
      await selected.refetch();
    },
  });
  const receipts = ledger.data ?? [];
  const selectedReceipt = selected.data;

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

  return <SignalShell><div className="pi-workspace">
    <section className="pi-page-intro"><div><div className="pi-kicker"><span>03</span> Proof profile / receipt boundary</div><h1>Your decisions stay<br /><em>inspectable.</em></h1><p>Proofcast separates what you forecast, what you traded, and what happened. Only your authenticated receipts appear here, and committed evidence is never replaced by a later story.</p></div><StatusChip tone={auth.isAuthenticated ? "live" : "unavailable"}>{auth.isAuthenticated ? "Authenticated ledger" : "Sign-in required"}</StatusChip></section>
    <section className="pi-score-strip"><div><span>Calibration</span><b>—</b><i>Requires resolved saved forecasts</i></div><div><span>Directional accuracy</span><b>—</b><i>Available after verified outcomes</i></div><div><span>Trading performance</span><b>—</b><i>Separate from forecast quality</i></div></section>
    {!auth.isAuthenticated ? <section className="pi-panel pi-receipt-layout"><article className="pi-receipt-instrument"><div className="pi-kicker"><span>Private ledger</span> Authentication boundary</div><h2>Sign in to inspect your receipts.</h2><p>A Decision Receipt belongs to the account that committed it. Proofcast will not infer a personal history from public market data.</p><button className="pi-action" onClick={() => startLogin()}>Sign in to continue <ArrowUpRight size={15} /></button></article><article className="pi-ledger"><div className="pi-kicker"><span>Receipt ledger</span> Owner scoped</div><div className="pi-ledger-empty"><LockKeyhole size={27} /><b>Your ledger is private.</b><p>Authentication is required before Proofcast requests receipt records.</p></div></article></section> : <section className="pi-receipt-layout"><article className="pi-panel pi-receipt-instrument"><div className="pi-kicker"><span>Decision receipt</span> Durable evidence</div><h2>Keep the decision, not just the outcome.</h2><p>Every committed receipt binds your forecast to the market snapshot captured by the server at commit time.</p><div className="pi-receipt-checks"><span><FileCheck2 size={16} /> Forecast premise and confidence</span><span><Scale size={16} /> Market versus your commitment</span><span><ShieldCheck size={16} /> Source timestamp and provenance</span></div><Link href="/market" className="pi-action">Create another receipt <ArrowUpRight size={15} /></Link></article><article className="pi-panel pi-ledger"><div className="pi-panel-head"><div><div className="pi-kicker"><span>Receipt ledger</span> {ledger.isLoading ? "Loading" : "Owner scoped history"}</div><h2>{ledger.isLoading ? "Loading receipts…" : receipts.length ? `${receipts.length} Decision Receipt${receipts.length === 1 ? "" : "s"}` : "No Decision Receipts yet"}</h2></div><StatusChip tone={ledger.isError ? "unavailable" : receipts.length ? "live" : "snapshot"}>{ledger.isError ? "Error" : receipts.length ? "Stored" : "Empty"}</StatusChip></div>{ledger.isLoading ? <div className="pi-loading-lines"><i /><i /><i /></div> : ledger.isError ? <div className="pi-ledger-empty" role="alert"><LockKeyhole size={27} /><b>Ledger unavailable.</b><p>Proofcast could not load your receipts. No local values are substituted.</p><button className="pi-action" onClick={() => ledger.refetch()}>Retry ledger</button></div> : receipts.length === 0 ? <div className="pi-ledger-empty"><FileCheck2 size={27} /><b>There is no record to overstate.</b><p>Your first committed forecast will appear here after the Market Decision review flow completes.</p></div> : <div className="pi-ledger-list" data-testid="receipt-ledger">{receipts.map(receipt => <button type="button" key={receipt.id} data-testid={`receipt-row-${receipt.id}`} className={`pi-ledger-entry ${selectedId === receipt.id ? "selected" : ""}`} onClick={() => setSelectedId(receipt.id)}><span><b>Receipt #{receipt.id}</b><small>{receipt.forecast.direction} · {percentFromBps(receipt.forecast.probabilityBps)} · {receipt.forecast.confidence}</small></span><span><small>{receipt.marketSnapshot.asset} · {receipt.marketSnapshot.marketState}</small><small>{receiptDate(receipt.createdAt)}</small></span><ArrowUpRight size={15} /></button>)}</div>}</article></section>}
    {selectedId && <section className="pi-panel pi-receipt-detail" data-testid="receipt-detail"><div className="pi-panel-head"><div><div className="pi-kicker"><span>Receipt #{selectedId}</span> Version {selectedReceipt?.version ?? "—"} / immutable commitment</div><h2>{selected.isLoading ? "Loading evidence…" : selectedReceipt ? selectedReceipt.forecast.thesis : "Receipt detail unavailable"}</h2></div><StatusChip tone={selectedReceipt ? "live" : "unavailable"}>{selected.isLoading ? "Loading" : selectedReceipt ? "Committed" : "Unavailable"}</StatusChip></div>{selectedReceipt && <>
      <div className="pi-detail-grid"><div><span>Direction / probability</span><b>{selectedReceipt.forecast.direction} · {percentFromBps(selectedReceipt.forecast.probabilityBps)}</b></div><div><span>Confidence</span><b>{selectedReceipt.forecast.confidence}</b></div><div><span>Market</span><b>{selectedReceipt.marketSnapshot.asset} · {selectedReceipt.marketSnapshot.question}</b></div><div><span>Source captured</span><b>{receiptDate(selectedReceipt.marketSnapshot.capturedAt)}</b></div><div><span>Counter-thesis</span><b>{selectedReceipt.forecast.counterThesis}</b></div><div><span>Evidence state</span><b>{selectedReceipt.marketSnapshot.marketState} · {selectedReceipt.marketSnapshot.network}</b></div></div>
      <div className="pi-evidence-stack"><div className="pi-kicker"><span>Revision history</span> Original commitment preserved</div>{selectedReceipt.revisions.length === 0 ? <p className="pi-lock-note">No revisions. This is the original committed forecast.</p> : selectedReceipt.revisions.map(item => <div className="pi-evidence-row" key={item.id} data-testid={`revision-row-${item.id}`}><span><b>Revision {item.revisionNumber}</b><small>{item.direction} · {percentFromBps(item.probabilityBps)} · {item.confidence}</small></span><small>{receiptDate(item.createdAt)}</small></div>)}<button type="button" className="pi-action" data-testid="revise-receipt" onClick={openRevision}>Create a revision <ArrowUpRight size={15} /></button></div>
      {revisionOpen && <form className="pi-evidence-form" data-testid="revision-form" onSubmit={event => { event.preventDefault(); revise.mutate({ receiptId: selectedId, ...revision }); }}><div className="pi-kicker"><span>Revision draft</span> New version, no overwrite</div><div className="pi-form-grid"><label>Direction<select value={revision.direction} onChange={event => setRevision({ ...revision, direction: event.target.value as "UP" | "DOWN" })}><option value="UP">UP</option><option value="DOWN">DOWN</option></select></label><label>Probability (%)<input type="number" min="1" max="99" step="0.1" value={revision.probabilityBps / 100} onChange={event => setRevision({ ...revision, probabilityBps: Math.round(Number(event.target.value) * 100) })} /></label><label>Confidence<select value={revision.confidence} onChange={event => setRevision({ ...revision, confidence: event.target.value as "LOW" | "MEDIUM" | "HIGH" })}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></label></div><label>Updated thesis<textarea required value={revision.thesis} onChange={event => setRevision({ ...revision, thesis: event.target.value })} /></label><label>Updated counter-thesis<textarea required value={revision.counterThesis} onChange={event => setRevision({ ...revision, counterThesis: event.target.value })} /></label><button className="pi-action" type="submit" disabled={revise.isPending}>{revise.isPending ? "Saving revision…" : "Commit revision"}</button>{revise.error && <p className="pi-error-note" role="alert">{revise.error.message}</p>}</form>}
      <div className="pi-evidence-stack"><div className="pi-kicker"><span>Resolution evidence</span> Verified outcome only</div>{selectedReceipt.resolutions.length === 0 ? <p className="pi-lock-note">No resolution evidence has been submitted. Proofcast will not infer an outcome from market movement.</p> : selectedReceipt.resolutions.map(item => <div className="pi-evidence-row" key={item.id} data-testid={`resolution-row-${item.id}`}><span><b>{item.outcome} outcome</b><small>{item.evidenceSummary}</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} /></a></span><StatusChip tone={item.verificationStatus === "VERIFIED" ? "live" : item.verificationStatus === "REJECTED" ? "unavailable" : "snapshot"}>{item.verificationStatus}</StatusChip></div>)}<form className="pi-evidence-form" data-testid="resolution-form" onSubmit={event => { event.preventDefault(); submitEvidence.mutate({ receiptId: selectedId, ...resolution }); }}><label>Outcome<select value={resolution.outcome} onChange={event => setResolution({ ...resolution, outcome: event.target.value as "YES" | "NO" | "VOID" })}><option value="YES">YES</option><option value="NO">NO</option><option value="VOID">VOID</option></select></label><label>Evidence source URL<input type="url" required placeholder="https://…" value={resolution.sourceUrl} onChange={event => setResolution({ ...resolution, sourceUrl: event.target.value })} /></label><label>Evidence summary<textarea required placeholder="What verified source supports this outcome?" value={resolution.evidenceSummary} onChange={event => setResolution({ ...resolution, evidenceSummary: event.target.value })} /></label><button className="pi-action" type="submit" disabled={submitEvidence.isPending}>{submitEvidence.isPending ? "Submitting evidence…" : "Submit for verification"}</button>{submitEvidence.error && <p className="pi-error-note" role="alert">{submitEvidence.error.message}</p>}</form></div>
    </>}{selected.error && <p className="pi-error-note" role="alert">This receipt could not be loaded.</p>}<div className="pi-lock-note"><LockKeyhole size={14} /> Only verified resolution evidence can support future scoring. Submitted evidence remains visibly unverified until an authorized reviewer confirms it.</div></section>}
    <section className="pi-panel pi-calibration-note"><div><div className="pi-kicker"><span>Calibration standard</span> Evidence before score</div><h2>Significance starts with enough resolved data.</h2><p>Proofcast does not create a composite score or claim calibration before there is a credible sample.</p></div><div><Clock3 size={16} /> Resolution data pending verification</div></section>
  </div></SignalShell>;
}
