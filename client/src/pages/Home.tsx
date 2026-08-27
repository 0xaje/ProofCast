/* Proof Instrument / Signal Room: live market context is treated as a primary evidence object, with category filtering and instantaneous discovery. */
import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import {
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
} from "lucide-react";
import { SignalShell, StatusChip } from "@/components/SignalShell";
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const data = snapshot.data;
  const rawMarkets = data?.markets ?? [];
  const state = snapshot.isError ? "ERROR" : data?.state;

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
              <span>01</span> Signal room / live context
            </div>
            <h1>
              See the signal.
              <br />
              <em>Own the decision.</em>
            </h1>
            <p>
              Live Event Contract context is a reference point—not a verdict. Proofcast keeps what the market shows,
              what you believe, and what later resolves in separate evidence lanes.
            </p>
            <div className="pi-head-actions">
              <Link
                href={lead ? `/market?market=${lead.marketId}` : "/market"}
                className="pi-action"
              >
                Review a live market <ArrowUpRight size={16} />
              </Link>
              <span className="pi-source-note">No custodial signer · zero order path</span>
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
                  ? "DreamDEX Event Contract snapshot"
                  : snapshot.isError
                  ? "The verified source needs a successful retry."
                  : "Checking DreamDEX mainnet."}
              </span>
            </div>
            <div className="pi-instrument-line">
              <span>Market</span>
              <span>Model</span>
              <span>You</span>
            </div>
          </aside>
        </section>

        {/* Discovery & Filter Bar */}
        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
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
                <h2>Active market reference</h2>
              </div>
              <span className="pi-timestamp">
                {snapshot.isLoading ? "Syncing" : `${filteredMarkets.length} matching signals`}
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
                    <div className="pi-market-id">{lead.asset} / EVENT CONTRACT</div>
                    <h3>{lead.question}</h3>
                    <p>
                      Market ID: {lead.marketId.slice(0, 18)}… · Indexed {lead.indexedStatus}
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
              <span>Proof loop</span> Do not collapse the layers
            </div>
            <div className="pi-loop-step">
              <span>01</span>
              <div>
                <b>Observe</b>
                <p>Read the market, its book, and its window.</p>
              </div>
            </div>
            <div className="pi-loop-step">
              <span>02</span>
              <div>
                <b>Commit</b>
                <p>State a forecast and the confidence behind it.</p>
              </div>
            </div>
            <div className="pi-loop-step">
              <span>03</span>
              <div>
                <b>Prove</b>
                <p>Compare the outcome against the original record.</p>
              </div>
            </div>
            <Link href="/proof" className="pi-text-link">
              Open proof ledger <ArrowUpRight size={15} />
            </Link>
          </aside>
        </section>

        {/* Extended Market Catalog Cards */}
        {filteredMarkets.length > 1 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f7b8f]">
                Discovered DreamDEX Contracts ({filteredMarkets.length})
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

        {/* Decision Hygiene Section */}
        <section className="pi-lane-section mt-10">
          <div className="pi-section-title">
            <div className="pi-kicker">
              <span>Decision hygiene</span> The durable boundary
            </div>
            <h2>Forecast quality is not trading performance.</h2>
          </div>
          <div className="pi-lanes">
            <article>
              <CircleDotDashed size={20} />
              <b>Market signal</b>
              <p>Live, sourced context with a visible freshness state.</p>
            </article>
            <article>
              <Check size={20} />
              <b>Forecast commitment</b>
              <p>Your thesis and confidence stay separate from the market.</p>
            </article>
            <article>
              <FileCheck2 size={20} />
              <b>Proof receipt</b>
              <p>An outcome record exists only when the inputs can be verified.</p>
            </article>
          </div>
        </section>
      </div>
    </SignalShell>
  );
}
