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
import React, { useState, useEffect } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWallet } from "@/contexts/WalletContext";
import { AnimatedComparisonBar } from "@/components/AnimatedComparisonBar";
import { SignalShell, StatusChip } from "@/components/SignalShell";
import { ModelComparisonSelector } from "@/components/ModelComparisonSelector";
import { PROOFCAST_ANCHOR_CONTRACT } from "@/lib/web3/somnia";
import type { ModelId } from "../../../server/eventforge/models/types";
import type { DreamDexMarketSnapshot } from "../../../server/dreamdex";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  const auth = useAuth();
  const wallet = useWallet();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const requestedId = searchParams.get("market");

  const snapshot = trpc.dreamdex.snapshot.useQuery(undefined, { refetchInterval: 15_000, retry: 1 });
  const utils = trpc.useUtils();

  const commitReceipt = trpc.receipts.create.useMutation({
    onSuccess: async () => {
      await utils.receipts.listMine.invalidate();
    },
  });

  const data = snapshot.data;
  const state = snapshot.isError ? "ERROR" : data?.state;

function findBestLiveMarket(
  markets: DreamDexMarketSnapshot[] | undefined,
  requestedId: string | null
): DreamDexMarketSnapshot | undefined {
  if (!markets || markets.length === 0) return undefined;
  if (requestedId) {
    const found = markets.find(item => item.marketId === requestedId);
    if (found) return found;
  }
  // 1. Prioritize active contracts that have real live order-book depth & mid price
  const withDepth = markets.find(
    item => item.marketState === "TRADING" && (item.midPercent != null || item.bestBidPercent != null)
  );
  if (withDepth) return withDepth;

  // 2. Prioritize active contracts with a traded last price
  const withLastPrice = markets.find(
    item => item.marketState === "TRADING" && item.lastPricePercent != null
  );
  if (withLastPrice) return withLastPrice;

  // 3. Any trading contract
  const anyTrading = markets.find(item => item.marketState === "TRADING");
  if (anyTrading) return anyTrading;

  return markets[0];
}

  // Persistent active market state prevents unmounting/losing drafting form during background 15s polls or contract rolls
  const [activeMarket, setActiveMarket] = useState<DreamDexMarketSnapshot | null>(null);

  useEffect(() => {
    if (!data?.markets?.length) return;
    const resolved = findBestLiveMarket(data.markets, requestedId);
    if (resolved) {
      setActiveMarket(prev => {
        if (!prev || (requestedId && prev.marketId !== requestedId)) {
          return resolved;
        }
        const liveUpdate = data.markets.find(item => item.marketId === prev.marketId);
        if (liveUpdate) {
          return liveUpdate;
        }
        return prev;
      });
    }
  }, [data?.markets, requestedId]);

  const market = activeMarket ?? findBestLiveMarket(data?.markets, requestedId);

  const [selectedModelId, setSelectedModelId] = useState<ModelId>("ensemble-oracle");
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [autoFillIndex, setAutoFillIndex] = useState(0);
  const [streamingReasoning, setStreamingReasoning] = useState<{ [key: string]: string }>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const multiModelQuery = trpc.eventforge.analyzeMultiModel.useQuery(
    { marketId: market?.marketId ?? "" },
    { enabled: !!market?.marketId, refetchInterval: 20_000 }
  );

  // Real-time EventForge SSE token streaming
  React.useEffect(() => {
    if (!market?.marketId) return;
    setIsStreaming(true);
    setStreamingReasoning({});

    const eventSource = new EventSource(`/api/eventforge/stream?marketId=${encodeURIComponent(market.marketId)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "token" && data.section) {
          setStreamingReasoning((prev) => ({
            ...prev,
            [data.section]: (prev[data.section] ?? "") + data.token,
          }));
        } else if (data.type === "complete" || data.type === "error") {
          setIsStreaming(false);
          eventSource.close();
        }
      } catch {
        // Safe stream token parse fallback
      }
    };

    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [market?.marketId]);

  const [viewMode, setViewMode] = useState<"SIMPLE" | "QUANT">("SIMPLE");
  const [stage, setStage] = useState<DecisionStage>("DRAFT");
  const [mobileTab, setMobileTab] = useState<MobileTab>("COMMIT");
  const [showDeepBook, setShowDeepBook] = useState(false);
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [forecast, setForecast] = useState(72);
  const [forecastRevision, setForecastRevision] = useState(0);
  const [side, setSide] = useState<"UP" | "DOWN">("UP");
  const [confidence, setConfidence] = useState<Confidence>("HIGH");
  const [thesis, setThesis] = useState("Order-book depth indicates net bid accumulation on Somnia with positive executable edge.");
  const [counterThesis, setCounterThesis] = useState("Short-term spread widening or adverse on-chain order flow could invalidate edge.");
  const [commitError, setCommitError] = useState<string | null>(null);

  const marketProbability = market?.midPercent ?? market?.lastPricePercent ?? (market?.yesBids?.[0]?.pricePercent ?? 39.1);
  const activeModelPrediction = multiModelQuery.data?.models[selectedModelId];
  const modelProbability = activeModelPrediction
    ? activeModelPrediction.probabilityBps / 100
    : multiModelQuery.data?.consensus
    ? multiModelQuery.data.consensus.ensembleProbabilityBps / 100
    : marketProbability;
  const marketQuality = multiModelQuery.data?.quality;

  const gap = forecast - marketProbability;
  const modelGap = modelProbability - marketProbability;

  const handleAutoFill = () => {
    setAutoFillIndex(prev => prev + 1);

    const asset = market?.asset ?? "BTC";
    const mid = marketProbability ? `${marketProbability.toFixed(1)}%` : "39.1%";
    const bid = market?.bestBidPercent ? `${market.bestBidPercent.toFixed(1)}%` : mid;
    const ask = market?.bestAskPercent ? `${market.bestAskPercent.toFixed(1)}%` : mid;
    const spread = market?.spreadBps ? `${market.spreadBps} bps` : "400 bps";

    const variants = [
      {
        source: "Meta-Oracle",
        thesis: multiModelQuery.data?.models?.["ensemble-oracle"]?.bullCase ||
          `EventForge Meta-Oracle detects asymmetric resting bid volume at ${bid} for ${asset}, underpricing consensus drift.`,
        counter: multiModelQuery.data?.models?.["ensemble-oracle"]?.counterThesis ||
          `Adverse macro shock or liquidity withdrawal before the 5-minute contract expiry window.`
      },
      {
        source: "DeepSeek R1",
        thesis: multiModelQuery.data?.models?.["deepseek-r1"]?.bullCase ||
          `Quantitative microstructure derivation calculates net bid-side accumulation on Somnia, favoring UP resolution above ${mid}.`,
        counter: multiModelQuery.data?.models?.["deepseek-r1"]?.counterThesis ||
          `Spread friction widening beyond ${spread} on Somnia Shannon could erode edge at settlement.`
      },
      {
        source: "Gemini 1.5",
        thesis: multiModelQuery.data?.models?.["gemini-1.5-flash"]?.bullCase ||
          `Order-book depth profile shows resilient bid support for ${asset}, absorbing selling pressure ahead of window close.`,
        counter: multiModelQuery.data?.models?.["gemini-1.5-flash"]?.counterThesis ||
          `Terminal time decay and rapid liquidity exhaustion on outer asks (${ask}) could invalidate premise.`
      },
      {
        source: "Claude 3.5 Sonnet",
        thesis: multiModelQuery.data?.models?.["claude-3.5-sonnet"]?.bullCase ||
          `Balanced order flow microstructure maintains support above ${bid}, creating high risk-adjusted asymmetry for ${side} outcome.`,
        counter: multiModelQuery.data?.models?.["claude-3.5-sonnet"]?.counterThesis ||
          `Liquidity fragmentation across Somnia binary pools before contract settlement.`
      },
    ];

    const pick = variants[autoFillIndex % variants.length];
    setThesis(pick.thesis);
    setCounterThesis(pick.counter);
    setStage("DRAFT");
    toast.success(`Auto-filled from EventForge AI (${pick.source})!`);
  };

  // True executable price calculation
  const bestAsk = market?.bestAskPercent ?? marketProbability ?? 50;
  const bestBid = market?.bestBidPercent ?? marketProbability ?? 50;
  const executablePrice = side === "UP" ? bestAsk : 100 - bestBid;
  const executableEdge = forecast - executablePrice - (market?.spreadBps && market.spreadBps > 400 ? 0.75 : 0.3);

  const modelLabel =
    selectedModelId === "ensemble-oracle"
      ? "EventForge (Meta-Oracle)"
      : selectedModelId === "deepseek-r1"
      ? "EventForge (DeepSeek R1)"
      : selectedModelId === "gemini-1.5-flash"
      ? "EventForge (Gemini 1.5)"
      : selectedModelId === "claude-3.5-sonnet"
      ? "EventForge (Claude 3.5)"
      : "EventForge (Microstructure)";

  const comparisonRows = [
    { label: "Market", value: marketProbability, kind: "source" as const, className: "market" },
    { label: modelLabel, value: modelProbability, kind: "source" as const, className: "model" },
    { label: "You", value: forecast, kind: "local" as const, className: "you" },
  ];

  const canReview = thesis.trim().length > 0 && counterThesis.trim().length > 0;

  const handleCommit = async () => {
    if (!market) return;
    if (!auth.isAuthenticated && !wallet.address) {
      setCommitError("Connect your Web3 wallet to create a verifiable Decision Receipt.");
      wallet.connect();
      return;
    }
    setCommitError(null);

    let signature: string | undefined = undefined;
    let signerAddress: string | undefined = undefined;
    const nowTimestamp = Math.floor(Date.now() / 1000);

    if (wallet.isConnected && wallet.address) {
      signerAddress = wallet.address;
      const sig = await wallet.signForecastCommitment({
        marketId: market.marketId,
        direction: side,
        probabilityBps: forecast * 100,
        confidence,
        thesis: thesis.trim(),
        counterThesis: counterThesis.trim(),
        timestamp: nowTimestamp,
      });
      if (sig) {
        signature = sig;
      }
    }

    const stakeWei = stakeAmount > 0 ? (BigInt(stakeAmount) * 10n ** 18n).toString() : undefined;

    commitReceipt.mutate(
      {
        marketId: market.marketId,
        direction: side,
        probabilityBps: forecast * 100,
        confidence,
        thesis: thesis.trim(),
        counterThesis: counterThesis.trim(),
        signerAddress,
        eip712Signature: signature,
        commitmentTimestamp: signature ? nowTimestamp : undefined,
        stakeAmountWei: stakeWei,
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
                Simple
              </button>
              <button
                type="button"
                onClick={() => setViewMode("QUANT")}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md transition ${
                  viewMode === "QUANT" ? "bg-white/20 text-white shadow" : "text-[#8e8c84] hover:text-white"
                }`}
              >
                Quant
              </button>
            </div>
            <StatusChip tone={qualityTone(marketQuality?.state)}>
              {marketQuality ? `Quality: ${marketQuality.state}` : "Analyzing Quality"}
            </StatusChip>
            <StatusChip tone={toneForState(state)}>{state ?? "checking"}</StatusChip>
          </div>
        </section>

        {snapshot.isLoading && !market ? (
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

              {market.marketState === "LOCKED" && (
                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:flex-row sm:items-center sm:justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="shrink-0 text-amber-400" />
                    <span>This 5-minute contract window has expired. Your thesis and STT stake are preserved.</span>
                  </div>
                  {data?.markets?.[0] && data.markets[0].marketId !== market.marketId && (
                    <button
                      type="button"
                      onClick={() => setActiveMarket(data.markets[0])}
                      className="shrink-0 rounded bg-amber-400/20 px-3 py-1 font-mono text-xs font-bold text-amber-300 hover:bg-amber-400/30 transition"
                    >
                      Switch to Live Window ({data.markets[0].asset}) ↗
                    </button>
                  )}
                </div>
              )}

              {/* 3-Way Metrics Bar */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
                {/* 1. Market Crowd Price */}
                <div className="rounded-xl border border-white/15 bg-[#141b27] p-3 sm:p-4 text-center">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    1. Market
                  </span>
                  <b className="mt-1 block font-mono text-xl font-black text-white sm:text-3xl">
                    {marketProbability == null ? "—" : `${marketProbability.toFixed(1)}%`}
                  </b>
                  <span className="mt-0.5 block text-[10px] font-mono text-slate-400">
                    {viewMode === "SIMPLE" ? "Crowd Price" : "Consensus Mid"}
                  </span>
                </div>

                {/* 2. EventForge AI */}
                <div className="rounded-xl border border-sky-500/30 bg-[#0f2133] p-3 sm:p-4 text-center">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
                    2. EventForge AI
                  </span>
                  <b className="mt-1 block font-mono text-xl font-black text-sky-300 sm:text-3xl">
                    {modelProbability == null ? "…" : `${modelProbability.toFixed(1)}%`}
                  </b>
                  <span className="mt-0.5 block text-[10px] font-mono text-slate-400">
                    {viewMode === "SIMPLE" ? "Multi-Model AI" : "Deterministic"}
                  </span>
                </div>

                {/* 3. Your Forecast */}
                <div className="rounded-xl border border-emerald-500/30 bg-[#0f261c] p-3 sm:p-4 text-center">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    3. Your Forecast
                  </span>
                  <b className="mt-1 block font-mono text-xl font-black text-white sm:text-3xl">
                    {forecast}% {side}
                  </b>
                  <span className="mt-0.5 block text-[10px] font-mono font-bold text-emerald-300">
                    {confidence} Conviction
                  </span>
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
                      {typeof row.value === "number"
                        ? `${row.value.toFixed(1)}% UP`
                        : multiModelQuery.isLoading
                        ? "Evaluating…"
                        : "50.0% UP"}
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
                        <span>01 / Provenance</span> On-Chain Resting Liquidity
                      </div>
                      <h2>Verified Order Book & Depth</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip tone={toneForState(state)}>{state ?? "LIVE"}</StatusChip>
                      <a
                        href={`https://shannon-explorer.somnia.network/address/${market.marketId.startsWith("0x") ? market.marketId : PROOFCAST_ANCHOR_CONTRACT}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[#c8f06a] hover:underline"
                        title="View verified contract on Somnia Shannon Testnet Explorer"
                      >
                        Somnia Explorer <ArrowUpRight size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="pi-book-columns">
                    {market.yesAsks.length > 0 ? (
                      <div className="pi-book-column ask">
                        <span className="pi-book-column-title">YES Asks (Sellers)</span>
                        <div className="space-y-1">
                          {market.yesAsks.slice(0, showDeepBook ? 10 : 3).map((ask, idx) => (
                            <div key={idx} className="pi-book-row">
                              <span className="font-mono font-bold text-white">{ask.pricePercent.toFixed(1)}%</span>
                              <span className="font-mono text-[#8e8c84]">{ask.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center font-mono text-[11px] text-slate-400">
                        <span>Resting liquidity pooled on Somnia AMM. Spread: <b className="text-white">{market.spreadBps} bps</b></span>
                      </div>
                    )}

                    {market.yesBids.length > 0 ? (
                      <div className="pi-book-column bid">
                        <span className="pi-book-column-title">YES Bids (Buyers)</span>
                        <div className="space-y-1">
                          {market.yesBids.slice(0, showDeepBook ? 10 : 3).map((bid, idx) => (
                            <div key={idx} className="pi-book-row">
                              <span className="font-mono font-bold text-white">{bid.pricePercent.toFixed(1)}%</span>
                              <span className="font-mono text-[#8e8c84]">{bid.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center font-mono text-[11px] text-slate-400">
                        <span>On-chain orderbook matching active for this 5-minute contract window.</span>
                      </div>
                    )}
                  </div>

                  <div className="pi-lock-note mt-3">
                    <Activity size={14} className="text-[#c8f06a]" />
                    Executable ask: <b>{bestAsk.toFixed(1)}%</b> · Executable bid: <b>{bestBid.toFixed(1)}%</b> · Spread: <b>{market.spreadBps ?? 0} bps</b>
                  </div>
                </div>

                {/* 2. EVENTFORGE DUAL-LAYER INTELLIGENCE & REASONING DRAWER */}
                <div className={mobileTab === "MARKET" ? "hidden lg:block" : ""}>
                  <ModelComparisonSelector
                    analysis={multiModelQuery.data}
                    selectedModelId={selectedModelId}
                    onSelectModel={setSelectedModelId}
                    isLoading={multiModelQuery.isLoading}
                  />
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

                  {stage === "DRAFT" ? (
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
                      <div className="mt-4 space-y-4">
                        <div className="rounded-xl border border-white/15 bg-[#141b27] p-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-200" htmlFor="thesis">
                              1. Decision Thesis (Why this direction?)
                            </label>
                            <button
                              type="button"
                              onClick={handleAutoFill}
                              className="inline-flex items-center gap-1.5 rounded-md bg-[#c8f06a]/15 border border-[#c8f06a]/30 px-2.5 py-1 text-[10px] font-mono font-bold text-[#c8f06a] hover:bg-[#c8f06a]/25 transition cursor-pointer"
                            >
                              <Sparkles size={11} className="text-amber-300" /> Auto-Fill from EventForge AI
                            </button>
                          </div>
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
                            className="w-full rounded-lg border border-slate-700 bg-black/60 p-3 text-xs font-sans text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                            style={{ color: "#ffffff", backgroundColor: "rgba(0,0,0,0.6)" }}
                          />
                        </div>

                        {/* Mandatory Counter-Thesis Challenge */}
                        <div className="rounded-xl border border-amber-500/40 bg-[#1c1611] p-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-amber-300" htmlFor="counter-thesis">
                              2. Counter-Thesis & Invalidation Condition
                            </label>
                            <button
                              type="button"
                              onClick={handleAutoFill}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300/80 hover:text-amber-200 transition cursor-pointer"
                            >
                              <Sparkles size={10} /> Rotate
                            </button>
                          </div>
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
                            className="w-full rounded-lg border border-amber-500/40 bg-black/60 p-3 text-xs font-sans text-white placeholder:text-amber-400/50 focus:border-amber-400 focus:outline-none"
                            style={{ color: "#ffffff", backgroundColor: "rgba(0,0,0,0.6)" }}
                          />
                        </div>
                      </div>

                      {/* Conviction Level */}
                      <div className="mt-4">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8e8c84] mb-1.5">
                          3. Conviction Tier
                        </span>
                        <div className="grid grid-cols-3 gap-2" aria-label="Forecast conviction">
                          {(["LOW", "MEDIUM", "HIGH"] as Confidence[]).map(level => {
                            const isActive = confidence === level;
                            return (
                              <button
                                key={level}
                                type="button"
                                data-testid={`confidence-${level.toLowerCase()}`}
                                onClick={() => {
                                  setConfidence(level);
                                  setStage("DRAFT");
                                }}
                                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-mono font-bold tracking-wider transition-all duration-200 ${
                                  isActive
                                    ? "border-2 border-[#c8f06a] bg-[#c8f06a]/20 text-[#c8f06a] shadow-[0_0_15px_rgba(200,240,106,0.3)] scale-[1.02]"
                                    : "border border-white/15 bg-white/[0.04] text-[#8e8c84] hover:border-white/30 hover:text-white"
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-[#c8f06a] shadow-[0_0_6px_#c8f06a]" : "bg-white/20"}`} />
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Review / Commit Action */}
                      <div className="mt-5">
                        <button
                          data-testid="review-forecast"
                          className={`w-full rounded-xl py-3.5 px-4 font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            canReview
                              ? "bg-[#c8f06a] text-[#0c1017] hover:bg-[#d8fa7a] shadow-[0_0_25px_rgba(200,240,106,0.35)] active:scale-[0.98]"
                              : "bg-white/10 text-[#8e8c84] cursor-not-allowed border border-white/10"
                          }`}
                          disabled={!canReview}
                          onClick={() => setStage("REVIEW")}
                        >
                          <FileCheck2 size={16} /> {canReview ? "Review & Freeze Receipt" : "Enter Thesis to Enable Review"}
                        </button>
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
                  ) : stage === "REVIEW" ? (
                    <div className="rounded-2xl border-2 border-[#c8f06a]/50 bg-[#0a0f16] p-5 space-y-4 shadow-[0_0_35px_rgba(0,0,0,0.8)] animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-white/15 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#c8f06a] animate-ping" />
                          <span className="text-xs font-black text-[#c8f06a] uppercase tracking-wider font-mono">
                            Cryptographic Decision Seal
                          </span>
                        </div>
                        <span className="rounded bg-[#c8f06a]/20 border border-[#c8f06a]/40 px-2 py-0.5 font-mono text-[10px] font-bold text-[#c8f06a]">
                          Draft Locked
                        </span>
                      </div>

                      <p className="text-xs text-[#cad5e2] leading-relaxed">
                        Verify your prediction parameters before freezing. This decision will be cryptographically hashed with <b>SHA-256</b> and anchored to Somnia.
                      </p>

                      {/* Forecast & Conviction Key Metrics Strip */}
                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/[0.05] border border-white/15 p-3">
                        <div>
                          <span className="block text-[10px] font-mono uppercase text-[#8e8c84]">Prediction</span>
                          <b className="text-sm sm:text-base font-black text-white">{side} ({forecast}%)</b>
                        </div>
                        <div>
                          <span className="block text-[10px] font-mono uppercase text-[#8e8c84]">Conviction</span>
                          <b className="text-sm sm:text-base font-black text-[#c8f06a]">{confidence}</b>
                        </div>
                        <div>
                          <span className="block text-[10px] font-mono uppercase text-[#8e8c84]">Net Edge</span>
                          <b className={`text-sm sm:text-base font-black ${executableEdge > 0 ? "text-[#c8f06a]" : "text-[#f04b2f]"}`}>
                            {executableEdge > 0 ? `+${executableEdge.toFixed(1)}%` : `${executableEdge.toFixed(1)}%`}
                          </b>
                        </div>
                      </div>

                      {/* Thesis Review Card */}
                      <div className="rounded-xl border border-white/15 bg-black/70 p-3.5 space-y-1">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#c8f06a]">
                          1. Decision Thesis
                        </span>
                        <p className="text-white text-xs leading-relaxed font-sans">{thesis}</p>
                      </div>

                      {/* Counter-Thesis Challenge Review Card */}
                      <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 space-y-1">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <ShieldAlert size={12} className="text-amber-400" />
                          2. Falsification Challenge
                        </span>
                        <p className="text-amber-100 text-xs leading-relaxed font-sans">{counterThesis}</p>
                      </div>

                      {/* Stake Selection */}
                      <div className="rounded-xl border border-white/15 bg-white/[0.04] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="stake-amount-input" className="text-white text-xs font-mono font-bold">
                            Stake STT (Optional Conviction Pool)
                          </label>
                          <span className="font-mono text-xs font-bold text-[#c8f06a]">
                            {stakeAmount > 0 ? `${stakeAmount} STT` : "0 STT (No Stake)"}
                          </span>
                        </div>
                        <p className="text-[10px] leading-snug text-[#8b96a8]">
                          Enter any custom STT amount. Transferred on-chain when you anchor this receipt on Somnia — not at commit.
                        </p>
                        <div className="relative">
                          <input
                            id="stake-amount-input"
                            type="number"
                            min="0"
                            step="any"
                            value={stakeAmount === 0 ? "" : stakeAmount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setStakeAmount(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            placeholder="Enter STT amount (optional)"
                            className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-[#6f7b8f] focus:border-[#c8f06a] focus:outline-none"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-white/80">STT</span>
                            {stakeAmount > 0 && (
                              <button
                                type="button"
                                onClick={() => setStakeAmount(0)}
                                className="text-[10px] text-white/50 hover:text-white underline"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cryptographic Proof Notice */}
                      <div className="rounded-lg bg-black/60 border border-white/10 p-2.5 flex items-center justify-between text-[11px] font-mono text-[#8e8c84]">
                        <span>Proof Security:</span>
                        <span className="text-[#c8f06a] font-bold">SHA-256 + Shannon Anchoring</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2">
                        <button
                          data-testid="commit-receipt"
                          className="w-full rounded-xl bg-[#c8f06a] py-3.5 px-4 font-mono text-xs font-black uppercase tracking-wider text-[#0c1017] hover:bg-[#d8fa7a] shadow-[0_0_25px_rgba(200,240,106,0.4)] active:scale-[0.98] transition flex items-center justify-center gap-2"
                          disabled={commitReceipt.isPending}
                          onClick={handleCommit}
                        >
                          <FileCheck2 size={16} />
                          {commitReceipt.isPending
                            ? "Hashing & Committing to Somnia…"
                            : stakeAmount > 0
                            ? `Freeze & Commit (${stakeAmount} STT at anchor)`
                            : "Freeze & Commit (0 STT at anchor)"}
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 font-mono text-xs font-bold text-white hover:bg-white/10 transition"
                          onClick={() => setStage("DRAFT")}
                        >
                          ← Edit Forecast & Arguments
                        </button>
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
                    </div>
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

            {/* MOBILE FLOATING COLLAPSIBLE 3-WAY COMPARISON DRAWER */}
            <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden border-t border-white/10 bg-[#0d1117]/95 p-3 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e8c84]">Stack:</span>
                  <span className="font-mono text-xs text-white">M: <b>{marketProbability?.toFixed(1)}%</b></span>
                  <span className="font-mono text-xs text-[#c8f06a]">AI: <b>{modelProbability?.toFixed(1)}%</b></span>
                  <span className="font-mono text-xs text-[#f04b2f]">You: <b>{forecast}%</b></span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                  className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-[#c8f06a] hover:bg-white/20"
                >
                  {mobileDrawerOpen ? "Hide Details ▲" : "Expand ▼"}
                </button>
              </div>

              {mobileDrawerOpen && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8e8c84]">Executable Edge:</span>
                    <b className={executableEdge > 0 ? "text-[#c8f06a]" : "text-[#f04b2f]"}>
                      {executableEdge > 0 ? `+${executableEdge.toFixed(1)}%` : `${executableEdge.toFixed(1)}%`}
                    </b>
                  </div>
                  {isStreaming && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#c8f06a]">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#c8f06a]" />
                      <span>Live EventForge SSE streaming active…</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SignalShell>
  );
}

