import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleDotDashed,
  FileCheck2,
  ScanLine,
  Search,
  SlidersHorizontal,
  Flame,
  Layers,
  Sparkles,
  TrendingUp,
  Fingerprint,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  History,
} from "lucide-react";
import { SignalShell, StatusChip } from "@/components/SignalShell";
import { ProofReplayModal, type CompletedProofItem } from "@/components/ProofReplayModal";
import { trpc } from "@/lib/trpc";

function timeLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${Math.max(0, minutes)}m`;
}

function qualityTone(state: string) {
  return state === "TRADING" ? ("live" as const) : state === "PREOPEN" ? ("snapshot" as const) : ("watch" as const);
}

type CategoryFilter = "ALL" | "CRYPTO" | "MACRO" | "AI_TECH" | "GOVERNANCE";

export default function Home() {
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const completedProofsQuery = trpc.receipts.completedProofs.useQuery({ limit: 6 }, { refetchInterval: 30_000 });
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReplayProof, setActiveReplayProof] = useState<CompletedProofItem | null>(null);

  const data = snapshot.data;
  const rawMarkets = data?.markets ?? [];
  const state = snapshot.isError ? "ERROR" : data?.state;
  const completedProofs = (completedProofsQuery.data ?? []) as CompletedProofItem[];

  // Filter markets by category and search
  const filteredMarkets = useMemo(() => {
    return rawMarkets.filter((m) => {
      // Category filter
      if (selectedCategory === "CRYPTO") {
        const isCrypto =
          m.asset.includes("BTC") ||
          m.asset.includes("ETH") ||
          m.asset.includes("SOM") ||
          m.asset.includes("SOL") ||
          m.question.toLowerCase().includes("bitcoin") ||
          m.question.toLowerCase().includes("ethereum") ||
          m.question.toLowerCase().includes("crypto");
        if (!isCrypto) return false;
      } else if (selectedCategory === "MACRO") {
        const isMacro =
          m.question.toLowerCase().includes("inflation") ||
          m.question.toLowerCase().includes("fed") ||
          m.question.toLowerCase().includes("rate") ||
          m.question.toLowerCase().includes("gdp") ||
          m.question.toLowerCase().includes("usd");
        if (!isMacro) return false;
      } else if (selectedCategory === "AI_TECH") {
        const isTech =
          m.question.toLowerCase().includes("ai") ||
          m.question.toLowerCase().includes("model") ||
          m.question.toLowerCase().includes("tech") ||
          m.question.toLowerCase().includes("gpu");
        if (!isTech) return false;
      } else if (selectedCategory === "GOVERNANCE") {
        const isGov =
          m.question.toLowerCase().includes("dao") ||
          m.question.toLowerCase().includes("vote") ||
          m.question.toLowerCase().includes("proposal");
        if (!isGov) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          m.question.toLowerCase().includes(q) ||
          m.asset.toLowerCase().includes(q) ||
          m.marketId.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [rawMarkets, selectedCategory, searchQuery]);

  const lead = filteredMarkets[0] ?? rawMarkets[0];
  const probability = lead?.midPercent ?? lead?.lastPricePercent;

  return (
    <SignalShell>
      <div className="pi-workspace">
        {/* Command Hero */}
        <section className="pi-command-hero">
          <div>
            <div className="pi-kicker">
              <span>01</span> Decision intelligence before commitment · Accountability after resolution
            </div>
            <h1>
              Challenge your thinking.
              <br />
              <em>Let reality judge it.</em>
            </h1>
            <p>
              ProofCast challenges your thinking before you commit with EventForge deterministic analysis and executable edge calculations. Then, reality measures your judgement after the DreamDEX contract resolves.
            </p>
            <div className="pi-head-actions">
              <Link
                href={lead ? `/market?market=${lead.marketId}` : "/market"}
                className="pi-action"
              >
                Inspect Live Market <ArrowUpRight size={16} />
              </Link>
              <span className="pi-source-note">Live-testnet validated · Zero custodial risk</span>
            </div>
          </div>

          <aside className="pi-hero-instrument">
            <div className="pi-instrument-top">
              <span>Source condition</span>
              <StatusChip tone={state === "LIVE" ? "live" : state === "STALE" ? "watch" : "unavailable"}>
                {state ?? "checking"}
              </StatusChip>
            </div>
            <div className="pi-orbit">
              <i />
              <i />
              <i />
            </div>
            <div className="pi-instrument-copy">
              <b>{state === "LIVE" ? "Verified market context" : "Market context withheld"}</b>
              <span>
                {state === "LIVE"
                  ? "Somnia DreamDEX Event Contract feed"
                  : snapshot.isError
                  ? "The verified source needs a successful retry."
                  : "Checking DreamDEX network status."}
              </span>
            </div>
            <div className="pi-instrument-line">
              <span>Market</span>
              <span>EventForge</span>
              <span>You</span>
            </div>
          </aside>
        </section>

        {/* SECTION 1: LIVE DREAMDEX MARKETS HEADER */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
              <span className="h-2 w-2 rounded-full bg-[#c8f06a] animate-pulse" /> Section 01 // Live DreamDEX Markets
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Active On-Chain Prediction Signals
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#c8f06a]/30 bg-[#c8f06a]/10 px-2.5 py-1 text-xs font-mono font-bold text-[#c8f06a]">
              🟢 Somnia DreamDEX Active ({filteredMarkets.length} Live)
            </span>
            <a
              href="#completed-proofs"
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-[#8e8c84] hover:text-white transition"
            >
              {completedProofs.length} Completed Proofs Ready ↓
            </a>
          </div>
        </div>

        {/* Quiet Trading Hours Guidance Card */}
        {filteredMarkets.length <= 1 && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#c8f06a]/30 bg-[#c8f06a]/[0.04] p-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8f06a]/20 text-[#c8f06a] font-bold">
                ✦
              </span>
              <div>
                <span className="font-bold text-white">Evaluating during quiet market hours?</span>
                <p className="text-[#a09e96] text-[11px] mt-0.5">
                  DreamDEX binary contracts run in designated trading windows. Inspect our genuine completed proofs below to see the full 10-point audit trail and Brier calibration score in action.
                </p>
              </div>
            </div>
            <a
              href="#completed-proofs"
              className="inline-flex items-center gap-1 rounded-lg bg-[#c8f06a] px-3.5 py-2 text-xs font-bold text-[#151515] transition hover:bg-[#d8fa7a] whitespace-nowrap self-start sm:self-auto"
            >
              Inspect Completed Proofs Replay <ArrowDownRight size={13} />
            </a>
          </div>
        )}

        {/* Discovery & Filter Bar */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Markets", icon: Layers },
              { id: "CRYPTO", label: "Crypto", icon: TrendingUp },
              { id: "MACRO", label: "Macro & Rates", icon: SlidersHorizontal },
              { id: "AI_TECH", label: "AI & Tech", icon: Sparkles },
              { id: "GOVERNANCE", label: "Governance", icon: Flame },
            ].map(({ id, label, icon: Icon }) => {
              const active = selectedCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id as CategoryFilter)}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-mono transition-all cursor-pointer ${
                    active
                      ? "border border-[#d7f36b]/40 bg-[#d7f36b]/15 text-[#d7f36b] shadow-[0_0_12px_rgba(215,243,107,0.15)] font-bold"
                      : "border border-white/5 bg-white/[0.02] text-[#8b96a8] hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7b8f]" />
            <input
              type="text"
              placeholder="Search markets, assets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 font-mono text-xs text-white placeholder:text-[#6f7b8f] focus:border-[#d7f36b]/50 focus:outline-none"
            />
          </div>
        </section>

        {/* Lead Market & Signal Grid */}
        <section className="pi-signal-grid">
          <div className="pi-panel pi-market-panel">
            <div className="pi-panel-head">
              <div>
                <div className="pi-kicker">
                  <span>Live board</span> Verified windows
                </div>
                <h2>Featured live contract</h2>
              </div>
              <span className="pi-timestamp">
                {snapshot.isLoading ? "Syncing" : `${filteredMarkets.length} active contracts`}
              </span>
            </div>

            {snapshot.isLoading ? (
              <div className="pi-loading-lines">
                <i />
                <i />
                <i />
              </div>
            ) : lead ? (
              <>
                <div className="pi-lead-market">
                  <div>
                    <div className="pi-market-id">{lead.asset} / SOMNIA DREAMDEX</div>
                    <h3>{lead.question}</h3>
                    <p>
                      Market ID: {lead.marketId.slice(0, 18)}… · Status: {lead.indexedStatus}
                    </p>
                  </div>
                  <div className="pi-probability">
                    <b>{probability == null ? "—" : `${probability.toFixed(1)}%`}</b>
                    <span>YES midpoint</span>
                  </div>
                </div>
                <div className="pi-market-rail">
                  <span className="pi-rail-fill" style={{ width: `${probability ?? 0}%` }} />
                  <span className="pi-rail-dot" style={{ left: `${probability ?? 0}%` }} />
                </div>
                <div className="pi-market-meta">
                  <span>
                    <b>{timeLabel(lead.secondsToExpiry)}</b> window remaining
                  </span>
                  <span>
                    <b>{lead.spreadBps == null ? "—" : `${lead.spreadBps} bps`}</b> observed spread
                  </span>
                  <StatusChip tone={qualityTone(lead.marketState)}>{lead.marketState}</StatusChip>
                </div>
              </>
            ) : (
              <div className="pi-empty-instrument">
                <ScanLine size={23} />
                <b>No matching markets found</b>
                <span>Try adjusting your search query or selected category filter.</span>
              </div>
            )}
          </div>

          <aside className="pi-panel pi-loop-panel">
            <div className="pi-kicker">
              <span>Decision loop</span> 3 Core Steps
            </div>
            <div className="pi-loop-step">
              <span>01</span>
              <div>
                <b>Observe</b>
                <p>Read the market spread, book, and resolution rules.</p>
              </div>
            </div>
            <div className="pi-loop-step">
              <span>02</span>
              <div>
                <b>Commit</b>
                <p>Challenge thinking with EventForge & freeze SHA-256 receipt.</p>
              </div>
            </div>
            <div className="pi-loop-step">
              <span>03</span>
              <div>
                <b>Prove</b>
                <p>Score Brier calibration when DreamDEX resolves on-chain.</p>
              </div>
            </div>
            <Link href="/market" className="pi-text-link">
              Launch Decision Surface <ArrowUpRight size={15} />
            </Link>
          </aside>
        </section>

        {/* Extended Market Catalog Cards */}
        {filteredMarkets.length > 1 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f7b8f]">
                Live DreamDEX Catalog ({filteredMarkets.length})
              </div>
              <span className="font-mono text-[11px] text-[#8b96a8]">Live Somnia Ingestion</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((m) => {
                const mid = m.midPercent ?? m.lastPricePercent ?? 50;
                return (
                  <article
                    key={m.marketId}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0a0e14]/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-[#d7f36b]/40 hover:bg-white/[0.04]"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg border border-[#d7f36b]/30 bg-[#d7f36b]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#d7f36b]">
                          {m.asset}
                        </span>
                        <span className="font-mono text-[10px] text-[#6f7b8f]">
                          {timeLabel(m.secondsToExpiry)} left
                        </span>
                      </div>
                      <h4 className="mt-3 font-display text-sm font-semibold leading-snug text-white">
                        {m.question}
                      </h4>
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#8b96a8]">YES Midpoint</span>
                        <span className="font-bold text-[#d7f36b]">{mid.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-[#d7f36b]" style={{ width: `${mid}%` }} />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#6f7b8f]">
                          Spread: {m.spreadBps ? `${m.spreadBps} bps` : "—"}
                        </span>
                        <Link
                          href={`/market?market=${m.marketId}`}
                          className="flex items-center gap-1 font-mono text-xs font-bold text-[#d7f36b] hover:underline"
                        >
                          Analyze & Commit <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2: COMPLETED PROOFS & PROOF REPLAY */}
        <section className="mt-16 border-t border-white/15 pt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f04b2f]">
                <Fingerprint size={14} /> Section 02 // Completed Proofs & Proof Replay
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Genuine Resolved Lifecycles
              </h2>
              <p className="mt-1 max-w-xl text-xs text-[#8e8c84]">
                Explore genuine historical DreamDEX lifecycles. Click <b>"Replay Proof"</b> on any record to inspect the complete 10-point audit trail from initial market snapshot to final Brier scoring.
              </p>
            </div>

            <Link
              href="/proof"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#c8f06a]/40 hover:text-[#c8f06a]"
            >
              <History size={14} /> View All Proofs ({completedProofs.length})
            </Link>
          </div>

          {completedProofs.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedProofs.map((proof) => (
                <article
                  key={proof.receiptId}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#10141c]/90 p-5 shadow-xl transition-all duration-200 hover:border-[#c8f06a]/40"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md border border-[#c8f06a]/30 bg-[#c8f06a]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#c8f06a]">
                        {proof.asset}
                      </span>
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${proof.resolutionOutcome === "YES" ? "bg-[#c8f06a]/20 text-[#c8f06a]" : "bg-[#f04b2f]/20 text-[#f04b2f]"}`}>
                        Outcome: {proof.resolutionOutcome}
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-sm font-semibold leading-snug text-white">
                      {proof.question}
                    </h4>

                    <div className="mt-3 space-y-1.5 text-xs font-mono text-[#a09e96]">
                      <div className="flex justify-between">
                        <span>User Forecast:</span>
                        <span className="font-bold text-white">
                          {proof.userProbabilityPercent}% {proof.userDirection}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Brier Score:</span>
                        <span className="font-bold text-[#c8f06a]">{proof.brierScore.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forecaster:</span>
                        <span className="text-white">{proof.forecasterName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <button
                      onClick={() => setActiveReplayProof(proof)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8f06a] py-2.5 text-xs font-bold uppercase tracking-wider text-[#151515] transition hover:bg-[#d8fa7a] active:scale-[0.98]"
                    >
                      <Play size={13} /> Replay Proof (10-Pt Audit)
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <History size={32} className="text-[#8e8c84]" />
              <h3 className="mt-3 text-sm font-bold text-white">No Completed Proofs Yet</h3>
              <p className="mt-1 max-w-md text-xs text-[#8e8c84]">
                Completed proofs appear here as active DreamDEX contracts reach resolution and are automatically verified by the resolution worker.
              </p>
            </div>
          )}
        </section>

        {/* Decision Hygiene Section */}
        <section className="pi-lane-section mt-16">
          <div className="pi-section-title">
            <div className="pi-kicker">
              <span>Decision hygiene</span> The durable boundary
            </div>
            <h2>Decision intelligence before commit. Accountability after.</h2>
          </div>
          <div className="pi-lanes">
            <article>
              <CircleDotDashed size={20} />
              <b>Market signal</b>
              <p>Live, sourced DreamDEX context with transparent spread and freshness.</p>
            </article>
            <article>
              <Check size={20} />
              <b>Pre-commit intelligence</b>
              <p>Deterministic EventForge analysis, market quality, and counter-theses.</p>
            </article>
            <article>
              <FileCheck2 size={20} />
              <b>Proof receipt</b>
              <p>SHA-256 immutable digest anchored on Somnia Shannon for Brier scoring.</p>
            </article>
          </div>
        </section>

        {/* Proof Replay Modal */}
        <ProofReplayModal
          proof={activeReplayProof}
          onClose={() => setActiveReplayProof(null)}
        />
      </div>
    </SignalShell>
  );
}

