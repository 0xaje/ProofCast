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
  Cpu,
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
  const snapshot = trpc.dreamdex.snapshot.useQuery({ limit: 6 }, { refetchInterval: 15_000, retry: 1 });
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
        return (
          m.asset.toLowerCase().includes(q) ||
          m.question.toLowerCase().includes(q) ||
          m.marketId.toLowerCase().includes(q)
        );
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
              <span>01 / PREDICTION INTELLIGENCE</span> Somnia DreamDEX Sub-Second Terminal
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-display">
              Prediction Market <span className="text-[#f43f5e]">Command Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mt-2">
              Trade and challenge live on-chain Somnia binary contracts. Benchmark crowd probability against multi-model AI, freeze immutable SHA-256 decision receipts, and prove Brier accuracy on Somnia Shannon.
            </p>
            <div className="pi-head-actions mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={lead ? `/market?market=${lead.marketId}` : "/market"}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0c1017] px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:bg-slate-200 active:scale-[0.98]"
              >
                Enter Lead Prediction Room ({lead?.asset ?? "LIVE"}) <ArrowUpRight size={15} />
              </Link>
              <a
                href="#completed-proofs"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-mono font-bold text-white/90 hover:bg-white/10 hover:border-white/30 transition"
              >
                Inspect 10-Point Proof Replay ↓
              </a>
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
              Somnia DreamDEX Active ({filteredMarkets.length} Live)
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
                      ? "border border-white/30 bg-white/15 text-white font-bold shadow-sm"
                      : "border border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={13} className={active ? "text-[#c8f06a]" : "text-slate-500"} />
                  <span className="text-white font-medium">{label}</span>
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
                    <Link href={`/market?market=${lead.marketId}`} className="hover:text-[#c8f06a] transition">
                      <h3 className="cursor-pointer">{lead.question}</h3>
                    </Link>
                    <p>
                      Market ID: {lead.marketId.slice(0, 18)}… · Status: {lead.indexedStatus}
                    </p>
                  </div>
                  <div className="pi-probability">
                    <b>{probability == null ? "50.0%" : `${probability.toFixed(1)}%`}</b>
                    <span>YES midpoint</span>
                  </div>
                </div>
                <div className="pi-market-rail">
                  <span className="pi-rail-fill" style={{ width: `${probability ?? 50}%` }} />
                  <span className="pi-rail-dot" style={{ left: `${probability ?? 50}%` }} />
                </div>
                <div className="pi-market-meta">
                  <span>
                    <b>{timeLabel(lead.secondsToExpiry)}</b> window remaining
                  </span>
                  <span>
                    <b>{lead.spreadBps == null ? "180 bps" : `${lead.spreadBps} bps`}</b> observed spread
                  </span>
                  <StatusChip tone={qualityTone(lead.marketState)}>{lead.marketState}</StatusChip>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-mono text-[#8b96a8]">
                    Live DreamDEX binary contract on Somnia
                  </span>
                  <Link
                    href={`/market?market=${lead.marketId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8f06a] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#151515] transition hover:bg-[#d8fa7a] shadow-[0_0_20px_rgba(200,240,106,0.3)] active:scale-[0.98]"
                  >
                    Enter Decision Room for {lead.asset} <ArrowUpRight size={15} />
                  </Link>
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

          <aside className="pi-panel pi-loop-panel relative flex flex-col justify-between overflow-hidden border border-white/10 bg-[#0a0e14]/95 p-6 shadow-2xl backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                  <span className="h-2 w-2 rounded-full bg-[#c8f06a] animate-pulse" /> Decision Loop
                </div>
                <span className="font-mono text-[10px] text-[#8b96a8]">3 Core Steps</span>
              </div>

              <div className="relative mt-5 space-y-4">
                {/* Connecting Rail Line */}
                <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-sky-400 via-[#c8f06a] to-rose-400 opacity-20" />

                {/* Step 1 */}
                <div className="relative flex items-start gap-3.5 group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-400/10 font-mono text-xs font-black text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                    01
                  </div>
                  <div>
                    <b className="font-display text-sm font-bold text-white group-hover:text-sky-300 transition">Observe</b>
                    <p className="text-xs text-[#8b96a8] leading-relaxed mt-0.5">
                      Ingest live DreamDEX market signals, order depth, and transparent spreads.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start gap-3.5 group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c8f06a]/40 bg-[#c8f06a]/10 font-mono text-xs font-black text-[#c8f06a] shadow-[0_0_15px_rgba(200,240,106,0.2)]">
                    02
                  </div>
                  <div>
                    <b className="font-display text-sm font-bold text-white group-hover:text-[#c8f06a] transition">Commit</b>
                    <p className="text-xs text-[#8b96a8] leading-relaxed mt-0.5">
                      Challenge beliefs with EventForge AI & freeze immutable SHA-256 evidence.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start gap-3.5 group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-400/10 font-mono text-xs font-black text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    03
                  </div>
                  <div>
                    <b className="font-display text-sm font-bold text-white group-hover:text-rose-300 transition">Prove</b>
                    <p className="text-xs text-[#8b96a8] leading-relaxed mt-0.5">
                      Verify Brier score calibration ($BS = (f - o)^2$) when the event contract resolves.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <Link
                href="/market"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white/10 to-white/5 border border-white/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#c8f06a]/50 hover:bg-[#c8f06a]/10 hover:text-[#c8f06a] active:scale-[0.98]"
              >
                Launch Decision Surface <ArrowUpRight size={14} />
              </Link>
            </div>
          </aside>
        </section>

        {/* Extended Live Market Catalog Cards */}
        {filteredMarkets.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                  <span className="h-2 w-2 rounded-full bg-[#c8f06a] animate-pulse" /> Live DreamDEX Catalog ({filteredMarkets.length} Active Contracts)
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">Explore Active On-Chain Prediction Windows</h3>
              </div>
              <span className="font-mono text-xs text-[#8b96a8] bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                Somnia Mainnet Ingestion Active
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((m) => {
                const mid = m.midPercent ?? m.lastPricePercent ?? 50;
                return (
                  <Link
                    key={m.marketId}
                    href={`/market?market=${m.marketId}`}
                    className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0a0e14]/95 p-5 shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-[#c8f06a] hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(200,240,106,0.18)] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8f06a]/40 bg-[#c8f06a]/15 px-2.5 py-1 font-mono text-[10px] font-black text-[#c8f06a] tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#c8f06a] animate-pulse" />
                          {m.asset} / SOMNIA
                        </span>
                        <span className="font-mono text-[11px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                          ⏱ {timeLabel(m.secondsToExpiry)} left
                        </span>
                      </div>
                      <h4 className="mt-3 font-display text-sm font-bold leading-snug text-white group-hover:text-[#c8f06a] transition">
                        {m.question}
                      </h4>
                      <p className="mt-1 text-[10px] font-mono text-[#6f7b8f]">
                        Contract ID: {m.marketId.slice(0, 14)}…{m.marketId.slice(-4)}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#8b96a8]">YES Consensus</span>
                        <b className="text-sm font-black text-[#c8f06a]">{mid.toFixed(1)}%</b>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-[#c8f06a] to-[#38bdf8] transition-all duration-300"
                          style={{ width: `${Math.max(5, Math.min(95, mid))}%` }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-[10px] font-mono text-[#8b96a8]">
                          Spread: <b className="text-white">{m.spreadBps ? `${m.spreadBps} bps` : "180 bps"}</b>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#c8f06a] px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider text-[#0c1017] group-hover:bg-[#d8fa7a] group-hover:shadow-[0_0_15px_rgba(200,240,106,0.5)] transition">
                          Enter Room <ArrowUpRight size={13} />
                        </span>
                      </div>
                    </div>
                  </Link>
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

        {/* Decision Hygiene & Intelligence Section */}
        <section className="mt-16 border-t border-white/15 pt-12 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                <ShieldCheck size={14} /> Decision Hygiene · The Durable Boundary
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Decision Intelligence Before Commitment. <span className="text-[#f43f5e]">Accountability After.</span>
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#8b96a8] max-w-2xl leading-relaxed">
                ProofCast enforces a strict cryptographic boundary: real-time market noise never rewrites your pre-committed thesis, and post-resolution settlement calibrates your true forecasting tier.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-[#8b96a8]">
                Deterministic Pipeline
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stage 1: Market Signal */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e141f] to-[#080b10] p-6 shadow-xl transition-all duration-300 hover:border-sky-400/50 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(56,189,248,0.15)]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                    <ScanLine size={20} />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-400/80 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-full">
                    Stage 01 / Context
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white group-hover:text-sky-300 transition">
                  Live Market Signal
                </h3>
                <p className="mt-2 text-xs text-[#8b96a8] leading-relaxed">
                  Real-time sub-second order book depth, implied crowd probability, and bid/ask spreads indexed directly from Somnia DreamDEX binary event contracts.
                </p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6f7b8f]">Input Source</span>
                <span className="font-mono text-xs font-bold text-sky-400">Somnia DreamDEX L1</span>
              </div>
            </div>

            {/* Stage 2: Pre-Commit Intelligence */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e141f] to-[#080b10] p-6 shadow-xl transition-all duration-300 hover:border-[#c8f06a]/50 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(200,240,106,0.15)]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#c8f06a]/30 bg-[#c8f06a]/10 text-[#c8f06a] shadow-[0_0_15px_rgba(200,240,106,0.2)]">
                    <Cpu size={20} />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#c8f06a]/80 bg-[#c8f06a]/10 border border-[#c8f06a]/20 px-2.5 py-1 rounded-full">
                    Stage 02 / Challenge
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white group-hover:text-[#c8f06a] transition">
                  Pre-Commit Intelligence
                </h3>
                <p className="mt-2 text-xs text-[#8b96a8] leading-relaxed">
                  Benchmark your thesis against EventForge deterministic multi-model AI, identify blindspots with explicit invalidation rules, and freeze reasoning before staking.
                </p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6f7b8f]">Cognitive Engine</span>
                <span className="font-mono text-xs font-bold text-[#c8f06a]">EventForge AI Suite</span>
              </div>
            </div>

            {/* Stage 3: Proof Receipt */}
            <div className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e141f] to-[#080b10] p-6 shadow-xl transition-all duration-300 hover:border-rose-400/50 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(244,63,94,0.15)]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    <Fingerprint size={20} />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-400/80 bg-rose-400/10 border border-rose-400/20 px-2.5 py-1 rounded-full">
                    Stage 03 / Provenance
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white group-hover:text-rose-300 transition">
                  On-Chain Proof Receipt
                </h3>
                <p className="mt-2 text-xs text-[#8b96a8] leading-relaxed">
                  Freeze an immutable SHA-256 evidence digest permanently anchored on Somnia Shannon. Reconciled upon contract settlement into a verified Brier calibration tier.
                </p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6f7b8f]">Smart Contract</span>
                <span className="font-mono text-xs font-bold text-rose-400">ProofCastAnchor.sol</span>
              </div>
            </div>
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

