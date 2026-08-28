import { Link, useSearch } from "wouter";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FileCheck2,
  LockKeyhole,
  Sparkles,
  ShieldAlert,
  Cpu,
  Activity,
  ChevronDown,
  Layers,
  Zap,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWallet } from "@/contexts/WalletContext";
import { AnimatedComparisonBar } from "@/components/AnimatedComparisonBar";
import { SignalShell, StatusChip } from "@/components/SignalShell";
import { trpc } from "@/lib/trpc";

type DecisionStage = "DRAFT" | "REVIEW" | "COMMITTED";
type Confidence = "LOW" | "MEDIUM" | "HIGH";
type MobileTab = "MARKET" | "INTELLIGENCE" | "COMMIT";

function timeLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${Math.max(0, minutes)}m`;
}

function toneForState(state: string | undefined) {
  return state === "LIVE" ? ("live" as const) : state === "STALE" ? ("watch" as const) : ("unavailable" as const);
}

function qualityTone(quality: string | undefined) {
  return quality === "TRADEABLE" ? ("live" as const) : quality === "WATCH" ? ("watch" as const) : ("unavailable" as const);
}

export default function MarketDecision() {
  const search = useSearch();
  const requestedId = new URLSearchParams(search).get("market");
  const auth = useAuth();
  const wallet = useWallet();
  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const utils = trpc.useUtils();

  const commitReceipt = trpc.receipts.create.useMutation({
    onSuccess: async () => {
      await utils.receipts.listMine.invalidate();
    },
  });

  const data = snapshot.data;
  const state = snapshot.isError ? "ERROR" : data?.state;
  const market = data?.markets.find(item => item.marketId === requestedId) ?? data?.markets[0];

  const eventforgeQuery = trpc.eventforge.analyze.useQuery(
    { marketId: market?.marketId ?? "" },
    { enabled: !!market?.marketId, refetchInterval: 20_000 }
  );

  const [viewMode, setViewMode] = useState<"SIMPLE" | "QUANT">("SIMPLE");
  const [stage, setStage] = useState<DecisionStage>("DRAFT");
  const [mobileTab, setMobileTab] = useState<MobileTab>("COMMIT");
  const [showDeepBook, setShowDeepBook] = useState(false);
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [forecast, setForecast] = useState(50);
  const [forecastRevision, setForecastRevision] = useState(0);
  const [side, setSide] = useState<"UP" | "DOWN">("UP");
  const [confidence, setConfidence] = useState<Confidence>("MEDIUM");
  const [thesis, setThesis] = useState("");
  const [counterThesis, setCounterThesis] = useState("");
  const [commitError, setCommitError] = useState<string | null>(null);

  const marketProbability = market?.midPercent ?? market?.lastPricePercent;
  const modelProbability = eventforgeQuery.data?.model ? eventforgeQuery.data.model.modelProbabilityBps / 100 : undefined;
  const marketQuality = eventforgeQuery.data?.quality;

  const gap = marketProbability == null ? null : forecast - marketProbability;
  const modelGap = modelProbability == null || marketProbability == null ? null : modelProbability - marketProbability;

  // True executable price calculation
  const bestAsk = market?.bestAskPercent ?? marketProbability ?? 50;
  const bestBid = market?.bestBidPercent ?? marketProbability ?? 50;
  const executablePrice = side === "UP" ? bestAsk : 100 - bestBid;
  const executableEdge = forecast - executablePrice - (market?.spreadBps && market.spreadBps > 400 ? 0.75 : 0.3);

  const comparisonRows = [
    { label: "Market", value: marketProbability, kind: "source" as const, className: "market" },
    { label: "EventForge", value: modelProbability, kind: "source" as const, className: "model" },
    { label: "You", value: forecast, kind: "local" as const, className: "you" },
  ];

  const canReview = thesis.trim().length > 0 && counterThesis.trim().length > 0;

  const handleCommit = () => {
    if (!market) return;
    if (!auth.isAuthenticated && !wallet.address) {
      setCommitError("Connect your Web3 wallet to create a verifiable Decision Receipt.");
      wallet.connect();
      return;
    }
    setCommitError(null);
    commitReceipt.mutate(
      {
        marketId: market.marketId,
        direction: side,
        probabilityBps: forecast * 100,
        confidence,
        thesis: thesis.trim(),
        counterThesis: counterThesis.trim(),
      },
      {
        onSuccess: () => setStage("COMMITTED"),
        onError: error => setCommitError(error.message),
      }
    );
  };

  return (
    <SignalShell>
      <div className="pi-workspace">
        <section className="pi-page-intro">
          <div>
            <div className="pi-kicker">
              <span>02</span> Decision Surface // Pre-Commit Intelligence + Post-Resolution Proof
            </div>
            <h1>
              Challenge your forecast.
              <br />
              <em>Commit with proof.</em>
            </h1>
            <p>
              Inspect what the market prices, test deterministic EventForge edge, and record your thesis with an immutable SHA-256 Decision Receipt.
            </p>
          </div>
          <div className="pi-status-stack">
            <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setViewMode("SIMPLE")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md transition ${
                  viewMode === "SIMPLE" ? "bg-[#c8f06a] text-[#151515] shadow" : "text-[#8e8c84] hover:text-white"
                }`}
              >
                ⚡ Simple
              </button>
              <button
                type="button"
                onClick={() => setViewMode("QUANT")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md transition ${
                  viewMode === "QUANT" ? "bg-white/20 text-white shadow" : "text-[#8e8c84] hover:text-white"
                }`}
              >
                📊 Quant
              </button>
            </div>
            <StatusChip tone={qualityTone(marketQuality?.state)}>
              {marketQuality ? `Quality: ${marketQuality.state}` : "Analyzing Quality"}
            </StatusChip>
            <StatusChip tone={toneForState(state)}>{state ?? "checking"}</StatusChip>
          </div>
        </section>

        {snapshot.isLoading ? (
          <div className="pi-decision-grid">
            <div className="pi-panel pi-skeleton" />
            <div className="pi-panel pi-skeleton" />
          </div>
        ) : !market ? (
          <section className="pi-panel pi-empty-instrument">
            <BookOpen size={24} />
            <b>Decision context is unavailable</b>
            <span>
              {snapshot.isError
                ? "The verified source query failed. No market or order-book values are shown."
                : data?.message ?? "No Event Contract was returned."}
            </span>
            <Link className="pi-action" href="/signal">
              Return to Signal Room <ArrowUpRight size={15} />
            </Link>
          </section>
        ) : (
          <>
            {/* ALWAYS-VISIBLE TOP COMPARISON ANCHOR: MARKET vs EVENTFORGE vs YOU */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-[#12161f] p-5 shadow-xl">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8f06a]">
                    <Activity size={13} /> Triangulated Probability Stack (Persistent Anchor)
                  </div>
                  <h3 className="mt-0.5 text-base font-bold text-white sm:text-lg">
                    {market.question}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[#c8f06a]/30 bg-[#c8f06a]/10 px-2.5 py-1 text-xs font-mono font-bold text-[#c8f06a]">
                    {market.asset}
                  </span>
                  <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-mono text-[#8e8c84]">
                    {timeLabel(market.secondsToExpiry)} left
                  </span>
                </div>
              </div>

              {/* 3-Way Metrics Bar */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/10 py-3 text-center sm:gap-4">
                <div className="rounded-lg bg-black/30 p-2.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8e8c84]">1. Market</span>
                  <b className="mt-1 block font-mono text-xl font-bold text-white sm:text-2xl">
                    {marketProbability == null ? "—" : `${marketProbability.toFixed(1)}%`}
                  </b>
                  <span className="text-[10px] text-[#8e8c84]">{viewMode === "SIMPLE" ? "Crowd Price" : "Consensus Mid"}</span>
                </div>
                <div className="rounded-lg bg-black/30 p-2.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#c8f06a]">2. EventForge</span>
                  <b className="mt-1 block font-mono text-xl font-bold text-[#c8f06a] sm:text-2xl">
                    {modelProbability == null ? "…" : `${modelProbability.toFixed(1)}%`}
                  </b>
                  <span className="text-[10px] text-[#8e8c84]">{viewMode === "SIMPLE" ? "AI Baseline" : "Deterministic"}</span>
                </div>
                <div className="rounded-lg bg-[#f04b2f]/10 border border-[#f04b2f]/30 p-2.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#f04b2f]">3. Your Forecast</span>
                  <b className="mt-1 block font-mono text-xl font-bold text-white sm:text-2xl">
                    {forecast}% {side}
                  </b>
                  <span className="text-[10px] text-[#f04b2f] font-semibold">{confidence} Conviction</span>
                </div>
              </div>

              {/* Visual Bars Comparison */}
              <div className="mt-4 space-y-2">
                {comparisonRows.map(row => (
                  <div key={row.label} className={`pi-comparison-row ${row.className}`}>
                    <span className="text-xs font-bold text-white/90">{row.label}</span>
                    <div>
                      <AnimatedComparisonBar
                        value={row.value}
                        kind={row.kind}
                        sourceAsOf={data?.asOf}
                        localRevision={row.kind === "local" ? forecastRevision : undefined}
                      />
                    </div>
                    <b className="font-mono text-xs font-bold text-white">
                      {typeof row.value === "number" ? `${row.value.toFixed(1)}% UP` : "Calculating…"}
                    </b>
                  </div>
                ))}
              </div>

              {/* Edge & Gap Summary */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#8e8c84]">
                <span>
                  {viewMode === "SIMPLE" ? "Your Real Edge: " : "Executable Edge: "}
                  <b className={executableEdge > 0 ? "text-[#c8f06a]" : "text-[#f04b2f]"}>
                    {executableEdge > 0 ? `+${executableEdge.toFixed(1)}%` : `${executableEdge.toFixed(1)}%`}
                  </b> {viewMode === "SIMPLE" ? "(after spread & fees)" : "(net of spread & slippage)"}
                </span>
                <span>
                  {viewMode === "SIMPLE" ? "Gap vs Crowd: " : "Gap vs Market: "}
                  <b className="text-white">{gap == null ? "—" : `${gap >= 0 ? "+" : ""}${gap.toFixed(1)} pts`}</b>
                </span>
              </div>
            </section>

            {/* MOBILE PROGRESSIVE DISCLOSURE TABS (Visible on Mobile Viewports) */}
            <div className="mt-6 flex rounded-xl border border-white/10 bg-black/40 p-1 lg:hidden">
              <button
                onClick={() => {
                  setMobileTab("MARKET");
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                  mobileTab === "MARKET"
                    ? "bg-white/15 text-white shadow"
                    : "text-[#8e8c84] hover:text-white"
                }`}
              >
                1. Market
              </button>
              <button
                onClick={() => {
                  setMobileTab("INTELLIGENCE");
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                  mobileTab === "INTELLIGENCE"
                    ? "bg-[#c8f06a] text-[#151515] shadow font-bold"
                    : "text-[#8e8c84] hover:text-white"
                }`}
              >
                2. Intelligence
              </button>
              <button
                onClick={() => {
                  setMobileTab("COMMIT");
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition ${
                  mobileTab === "COMMIT"
                    ? "bg-[#f04b2f] text-white shadow font-bold"
                    : "text-[#8e8c84] hover:text-white"
                }`}
              >
                3. Commit
              </button>
            </div>

            {/* MAIN INTERACTIVE WORKSPACE (Desktop Side-by-Side / Mobile Tabbed) */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* LEFT / CENTER COLUMN: MARKET CONTEXT & INTELLIGENCE */}
              <div className={`space-y-6 lg:col-span-7 ${mobileTab === "COMMIT" ? "hidden lg:block" : ""}`}>
                {/* 1. MARKET ORDERBOOK & LIQUIDITY (Shown when tab is MARKET on mobile or always on desktop) */}
                <div className={`pi-panel pi-book-panel ${mobileTab === "INTELLIGENCE" ? "hidden lg:block" : ""}`}>
                  <div className="pi-panel-head">
                    <div>
                      <div className="pi-kicker">
                        <span>Evidence Column</span> Live Somnia DreamDEX Book
                      </div>
                      <h2>Order Book & Depth</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://prd.smk.somnia.host/v1/graphql#market-${market.marketId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#c8f06a] hover:underline"
                      >
                        Contract Source <ArrowUpRight size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="pi-book-head">
                    <span>Ask price</span>
                    <span>Size</span>
                  </div>
                  <div className="pi-book-list">
                    {market.yesAsks.length ? (
                      market.yesAsks.slice(0, showDeepBook ? 10 : 3).map(row => (
                        <div key={`a-${row.pricePercent}-${row.quantity}`}>
                          <b>{row.pricePercent.toFixed(2)}%</b>
                          <span>{row.quantity}</span>
                        </div>
                      ))
                    ) : (
                      <p>No current YES asks returned.</p>
                    )}
                  </div>
                  <div className="pi-book-mid">
                    <span>Midpoint</span>
                    <b>{marketProbability == null ? "—" : `${marketProbability.toFixed(2)}%`}</b>
                  </div>
                  <div className="pi-book-list bids">
                    {market.yesBids.length ? (
                      market.yesBids.slice(0, showDeepBook ? 10 : 3).map(row => (
                        <div key={`b-${row.pricePercent}-${row.quantity}`}>
                          <b>{row.pricePercent.toFixed(2)}%</b>
                          <span>{row.quantity}</span>
                        </div>
                      ))
                    ) : (
                      <p>No current YES bids returned.</p>
                    )}
                  </div>

                  {market.yesAsks.length > 3 && (
                    <button
                      onClick={() => setShowDeepBook(!showDeepBook)}
                      className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#8e8c84] hover:text-white"
                    >
                      {showDeepBook ? "Collapse depth" : `Show ${market.yesAsks.length} levels`}
                    </button>
                  )}

                  <div className="pi-lock-note mt-3">
                    <Activity size={14} className="text-[#c8f06a]" />
                    Executable ask: <b>{bestAsk.toFixed(1)}%</b> · Executable bid: <b>{bestBid.toFixed(1)}%</b> · Spread: <b>{market.spreadBps ?? 0} bps</b>
                  </div>
                </div>

                {/* 2. EVENTFORGE PRE-COMMIT INTELLIGENCE (Shown when tab is INTELLIGENCE on mobile or always on desktop) */}
                <div className={`pi-panel ${mobileTab === "MARKET" ? "hidden lg:block" : ""}`}>
                  <div className="pi-panel-head">
                    <div>
                      <div className="pi-kicker text-[#c8f06a]">
                        <Cpu size={12} className="inline mr-1" /> Pre-Commit Intelligence // Layer A + B
                      </div>
                      <h2>EventForge Analysis</h2>
                    </div>
                    <span className="rounded bg-[#c8f06a]/15 px-2 py-0.5 font-mono text-xs font-bold text-[#c8f06a]">
                      {eventforgeQuery.data?.model.modelConfidence ?? "Deterministic"} Model
                    </span>
                  </div>

                  {eventforgeQuery.data?.reasoning ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                        <div className="rounded-lg border border-white/5 bg-black/30 p-3">
                          <b className="mb-1 block font-bold text-[#c8f06a]">Bullish Microstructure</b>
                          <p className="text-white/70 leading-relaxed">{eventforgeQuery.data.reasoning.bullCase}</p>
                        </div>
                        <div className="rounded-lg border border-[#f04b2f]/20 bg-black/30 p-3">
                          <b className="mb-1 block font-bold text-[#f04b2f]">Downside Risk Thesis</b>
                          <p className="text-white/70 leading-relaxed">{eventforgeQuery.data.reasoning.bearCase}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-xs">
                        <div className="flex items-center justify-between text-[#8e8c84]">
                          <span className="font-bold text-white">Disagreement Analysis:</span>
                          <span className="text-[#c8f06a]">Uncertainty: {eventforgeQuery.data.reasoning.uncertaintyLevel}</span>
                        </div>
                        <p className="mt-1 text-white/80 leading-relaxed">
                          {eventforgeQuery.data.reasoning.disagreementAnalysis}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-[#8e8c84]">
                      Calculating dual-layer EventForge intelligence…
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: DECISION COMMIT TERMINAL */}
              <div className={`lg:col-span-5 ${mobileTab !== "COMMIT" ? "hidden lg:block" : ""}`}>
                <div className="pi-panel pi-forecast-panel" data-testid="forecast-workflow">
                  <div className="pi-kicker">
                    <span>Decision Surface</span> {stage === "DRAFT" ? "Draft Only" : stage === "REVIEW" ? "Review Before Freeze" : "Receipt Committed"}
                  </div>
                  <h2>
                    {stage === "DRAFT"
                      ? "Make your forecast specific."
                      : stage === "REVIEW"
                      ? "Review record before committing."
                      : "Decision Receipt committed."}
                  </h2>

                  {stage !== "COMMITTED" ? (
                    <>
                      {/* Direction Selection */}
                      <div className="pi-side-toggle">
                        <button
                          data-testid="forecast-up"
                          onClick={() => {
                            setSide("UP");
                            setStage("DRAFT");
                          }}
                          className={side === "UP" ? "active" : ""}
                        >
                          UP
                        </button>
                        <button
                          data-testid="forecast-down"
                          onClick={() => {
                            setSide("DOWN");
                            setStage("DRAFT");
                          }}
                          className={side === "DOWN" ? "active down" : ""}
                        >
                          DOWN
                        </button>
                      </div>

                      {/* Probability Slider */}
                      <div className="pi-forecast-value">
                        <b>{forecast}%</b>
                        <span>
                          {side} at expiry
                          <br />
                          {gap == null ? "market unavailable" : `${gap >= 0 ? "+" : ""}${gap.toFixed(1)} points vs market`}
                        </span>
                      </div>

                      <input
                        data-testid="forecast-slider"
                        aria-label="Forecast probability"
                        type="range"
                        min="1"
                        max="99"
                        value={forecast}
                        onChange={event => {
                          setForecast(Number(event.target.value));
                          setForecastRevision(revision => revision + 1);
                          setStage("DRAFT");
                          setCommitError(null);
                        }}
                      />

                      {/* Thesis Input */}
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8c84] mb-1" htmlFor="thesis">
                            1. Decision Thesis (Why this direction?)
                          </label>
                          <textarea
                            id="thesis"
                            data-testid="forecast-thesis"
                            value={thesis}
                            onChange={event => {
                              setThesis(event.target.value);
                              setStage("DRAFT");
                            }}
                            placeholder="State your primary rationale based on order book, on-chain signal, or catalyst…"
                            rows={3}
                            className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white placeholder:text-[#6f7b8f] focus:border-[#c8f06a] focus:outline-none"
                          />
                        </div>

                        {/* Mandatory Counter-Thesis Challenge */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#f04b2f] mb-1" htmlFor="counter-thesis">
                            2. Counter-Thesis Challenge (What could make you wrong?)
                          </label>
                          <textarea
                            id="counter-thesis"
                            data-testid="forecast-counter-thesis"
                            value={counterThesis}
                            onChange={event => {
                              setCounterThesis(event.target.value);
                              setStage("DRAFT");
                            }}
                            placeholder="Mandatory pre-commit challenge: liquidity shock, catalyst delay, adverse order flow…"
                            rows={3}
                            className="w-full rounded-lg border border-[#f04b2f]/30 bg-black/40 p-3 text-xs text-white placeholder:text-[#6f7b8f] focus:border-[#f04b2f] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Conviction Level */}
                      <div className="mt-4">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8c84] mb-1.5">
                          3. Conviction Tier
                        </span>
                        <div className="pi-confidence" aria-label="Forecast confidence">
                          {(["LOW", "MEDIUM", "HIGH"] as Confidence[]).map(level => (
                            <button
                              key={level}
                              type="button"
                              data-testid={`confidence-${level.toLowerCase()}`}
                              onClick={() => {
                                setConfidence(level);
                                setStage("DRAFT");
                              }}
                              className={confidence === level ? "active" : ""}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Review / Commit Action */}
                      <div className="mt-5">
                        {stage === "DRAFT" ? (
                          <button
                            data-testid="review-forecast"
                            className="pi-action full"
                            disabled={!canReview}
                            onClick={() => setStage("REVIEW")}
                          >
                            <FileCheck2 size={15} /> Review & Freeze Receipt
                          </button>
                        ) : (
                          <div className="rounded-xl border border-[#c8f06a]/30 bg-black/60 p-4 space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-[#c8f06a] uppercase tracking-wider">
                                Pre-Commit Decision Review
                              </span>
                              <span className="font-mono text-[10px] text-[#8e8c84]">Draft Locked</span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-2 font-mono">
                                <div>
                                  <span className="text-[#8e8c84] block text-[10px]">Your Forecast:</span>
                                  <b className="text-white text-sm">{side} ({forecast}%)</b>
                                </div>
                                <div>
                                  <span className="text-[#8e8c84] block text-[10px]">Conviction:</span>
                                  <b className="text-[#c8f06a] text-sm">{confidence}</b>
                                </div>
                              </div>

                              <div className="rounded-lg bg-white/5 p-2">
                                <span className="text-[#8e8c84] block text-[10px] uppercase font-bold">1. Decision Thesis:</span>
                                <p className="text-white text-xs mt-0.5 leading-relaxed">{thesis}</p>
                              </div>

                              <div className="rounded-lg bg-[#f04b2f]/10 border border-[#f04b2f]/20 p-2">
                                <span className="text-[#f04b2f] block text-[10px] uppercase font-bold">2. Counter-Thesis:</span>
                                <p className="text-white/90 text-xs mt-0.5 leading-relaxed">{counterThesis}</p>
                              </div>

                              <div className="flex items-center justify-between rounded-lg bg-black/40 p-2 text-[11px] font-mono border border-white/5">
                                <span className="text-[#8e8c84]">Executable Edge (net):</span>
                                <b className={executableEdge > 0 ? "text-[#c8f06a]" : "text-[#f04b2f]"}>
                                  {executableEdge > 0 ? `+${executableEdge.toFixed(1)}%` : `${executableEdge.toFixed(1)}%`}
                                </b>
                              </div>
                            </div>

                            <button
                              data-testid="commit-receipt"
                              className="pi-action full mt-3"
                              disabled={commitReceipt.isPending}
                              onClick={handleCommit}
                            >
                              {commitReceipt.isPending ? "Hashing & Committing…" : "Freeze & Commit SHA-256 Receipt"}
                            </button>
                            <button
                              type="button"
                              className="pi-text-link text-xs block text-center mt-2 text-[#8e8c84] hover:text-white"
                              onClick={() => setStage("DRAFT")}
                            >
                              ← Edit Forecast & Arguments
                            </button>
                          </div>
                        )}
                      </div>

                      {commitError && (
                        <p className="pi-error-note mt-3 text-xs text-[#f04b2f]" role="alert">
                          {commitError}{" "}
                          {!auth.isAuthenticated && (
                            <button type="button" onClick={() => startLogin()} className="pi-inline-link font-bold underline">
                              Sign in
                            </button>
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="pi-committed-card rounded-xl border border-[#c8f06a]/40 bg-[#121820] p-5 text-center space-y-3" data-testid="receipt-committed">
                      <FileCheck2 size={28} className="mx-auto text-[#c8f06a]" />
                      <b className="block text-base text-white">Your Decision Receipt is Frozen.</b>
                      <p className="text-xs text-[#a09e96] leading-relaxed">
                        Receipt saved with server-captured market snapshot and EventForge model metrics. Once DreamDEX resolves, your Brier score will automatically calibrate.
                      </p>
                      <Link href="/proof" className="pi-action full mt-3">
                        Inspect in Proof Profile <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SignalShell>
  );
}

