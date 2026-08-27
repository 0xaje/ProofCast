/* Proof Instrument / Global Leaderboard: verifiable forecasting calibration rankings across the Somnia ecosystem. */
import * as React from "react";
import { Link } from "wouter";
import { ArrowUpRight, CheckCircle2, RefreshCw, ShieldCheck, Trophy, Users } from "lucide-react";
import { SignalShell, StatusChip } from "@/components/SignalShell";
import { trpc } from "@/lib/trpc";

export default function Leaderboard() {
  const [filter, setFilter] = React.useState<"ALL" | "PROVEN" | "ANCHORED">("ALL");
  const leaderboardQuery = trpc.receipts.leaderboard.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const entries = leaderboardQuery.data ?? [];

  const filteredEntries = React.useMemo(() => {
    if (filter === "PROVEN") return entries.filter(e => e.status === "PROVEN");
    if (filter === "ANCHORED") return entries.filter(e => e.anchoredCount > 0);
    return entries;
  }, [entries, filter]);

  const totalForecasters = entries.length;
  const totalVerified = entries.reduce((sum, e) => sum + e.verifiedCount, 0);
  const totalAnchored = entries.reduce((sum, e) => sum + e.anchoredCount, 0);
  const avgBrier =
    entries.filter(e => e.meanBrierScoreBps !== null).length > 0
      ? (
          entries.filter(e => e.meanBrierScoreBps !== null).reduce((sum, e) => sum + (e.meanBrierScoreBps ?? 0), 0) /
          entries.filter(e => e.meanBrierScoreBps !== null).length /
          10_000
        ).toFixed(4)
      : "—";

  return (
    <SignalShell>
      <div className="pi-workspace space-y-8">
        {/* Header Hero */}
        <section className="pi-command-hero">
          <div>
            <div className="pi-kicker">
              <span>04</span> Global Proof Protocol / Reputation
            </div>
            <h1>
              Verifiable Calibration.<br />
              <em>Global Forecaster Leaderboard</em>
            </h1>
            <p>
              Rankings on ProofCast are computed strictly from verified Brier calibration ($BS = (f - o)^2$) and
              cryptographic on-chain commitments. No speculative betting noise or unverifiable claims.
            </p>
            <div className="pi-head-actions">
              <Link href="/proof" className="pi-action">
                View My Proof Profile <ArrowUpRight size={16} />
              </Link>
              <span className="pi-source-note">Ranked by lowest Brier score (best calibration)</span>
            </div>
          </div>

          <aside className="pi-hero-instrument">
            <div className="pi-instrument-top">
              <span>Ecosystem Integrity</span>
              <StatusChip tone="live">SOMNIA ANCHORED</StatusChip>
            </div>
            <div className="pi-orbit">
              <i />
              <i />
              <i />
            </div>
            <div className="pi-instrument-copy">
              <b>{totalVerified} Verified Settlements</b>
              <span>Automated DreamDEX event contract resolutions and SHA-256 evidence proofs.</span>
            </div>
            <div className="pi-instrument-line">
              <span>Math</span>
              <span>Evidence</span>
              <span>Truth</span>
            </div>
          </aside>
        </section>

        {/* Global Aggregate Metrics */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7b8f]">
              <Users size={14} className="text-[#8ba6ff]" /> Active Forecasters
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {totalForecasters}
            </div>
            <div className="mt-1 text-[11px] text-[#7f8a9e]">Committed decision receipts</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7b8f]">
              <CheckCircle2 size={14} className="text-[#d7f36b]" /> Verified Settlements
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-tight text-[#d7f36b] sm:text-3xl">
              {totalVerified}
            </div>
            <div className="mt-1 text-[11px] text-[#7f8a9e]">Audited outcome resolutions</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7b8f]">
              <ShieldCheck size={14} className="text-emerald-400" /> Somnia Anchors
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-tight text-emerald-400 sm:text-3xl">
              {totalAnchored}
            </div>
            <div className="mt-1 text-[11px] text-[#7f8a9e]">On-chain Shannon commitments</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6f7b8f]">
              <Trophy size={14} className="text-amber-400" /> Network Mean Brier
            </div>
            <div className="mt-2 font-display text-2xl font-bold tracking-tight text-amber-400 sm:text-3xl">
              {avgBrier}
            </div>
            <div className="mt-1 text-[11px] text-[#7f8a9e]">Lower is superior calibration</div>
          </div>
        </section>

        {/* Filter Bar & Controls */}
        <section className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === "ALL"
                  ? "bg-white text-black"
                  : "bg-white/5 text-[#8b96a8] hover:bg-white/10 hover:text-white"
              }`}
            >
              All Forecasters ({entries.length})
            </button>
            <button
              onClick={() => setFilter("PROVEN")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === "PROVEN"
                  ? "bg-[#d7f36b] text-black"
                  : "bg-white/5 text-[#8b96a8] hover:bg-white/10 hover:text-white"
              }`}
            >
              Proven Calibration ($N \ge 5$)
            </button>
            <button
              onClick={() => setFilter("ANCHORED")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === "ANCHORED"
                  ? "bg-emerald-400 text-black"
                  : "bg-white/5 text-[#8b96a8] hover:bg-white/10 hover:text-white"
              }`}
            >
              On-Chain Anchored Only
            </button>
          </div>

          <button
            onClick={() => leaderboardQuery.refetch()}
            disabled={leaderboardQuery.isFetching}
            className="flex items-center gap-2 text-xs text-[#8b96a8] hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={leaderboardQuery.isFetching ? "animate-spin" : ""} />
            Refresh Leaderboard
          </button>
        </section>

        {/* Leaderboard Table / Cards */}
        <section className="space-y-3">
          {leaderboardQuery.isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-[#8b96a8]">
              Computing verified calibration scores across Somnia network…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <Trophy size={32} className="mx-auto mb-3 text-white/30" />
              <div className="font-medium text-white">No forecasters match the current filter</div>
              <div className="mt-1 text-xs text-[#8b96a8]">
                Commit and resolve decision receipts to appear on the global leaderboard.
              </div>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div
                key={entry.userId}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-[#d7f36b]/30 hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Rank & User Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold ${
                      entry.rank === 1
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                        : entry.rank === 2
                        ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                        : entry.rank === 3
                        ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                        : "bg-white/5 text-[#8b96a8] border border-white/10"
                    }`}
                  >
                    #{entry.rank}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{entry.displayName}</span>
                      <StatusChip
                        tone={
                          entry.status === "PROVEN"
                            ? "live"
                            : entry.status === "CALIBRATING"
                            ? "watch"
                            : "snapshot"
                        }
                      >
                        {entry.status}
                      </StatusChip>
                      {entry.anchoredCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400" title="Anchored on Somnia Shannon Testnet">
                          <ShieldCheck size={12} /> {entry.anchoredCount} on-chain
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-[#8b96a8]">
                      {entry.totalReceipts} receipts committed · {entry.verifiedCount} verified outcomes
                    </div>
                  </div>
                </div>

                {/* Score Stats */}
                <div className="flex items-center gap-6 text-left sm:text-right">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#6f7b8f]">Brier Score</div>
                    <div className="font-mono text-base font-bold text-white sm:text-lg">
                      {entry.brierScoreFormatted}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#6f7b8f]">Accuracy</div>
                    <div className="font-mono text-base font-bold text-[#d7f36b] sm:text-lg">
                      {entry.directionalAccuracyPct !== null ? `${entry.directionalAccuracyPct}%` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </SignalShell>
  );
}
