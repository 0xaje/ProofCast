import type { DreamDexMarketSnapshot } from "./dreamdex";

export type MarketQualityState = "TRADEABLE" | "WATCH" | "NO_TRADE";

export interface MarketQualityEvaluation {
  state: MarketQualityState;
  score: number; // 0 to 100
  reasons: string[];
  spreadOk: boolean;
  depthOk: boolean;
  timeRemainingOk: boolean;
  marketStateOk: boolean;
}

/**
 * Priority 5: Deterministic Market Quality Engine.
 * 
 * Evaluates whether a DreamDEX market is safe and liquid enough for trade execution.
 * Does NOT use AI for this decision; relies entirely on strict algorithmic criteria.
 */
export function evaluateMarketQuality(snapshot: DreamDexMarketSnapshot): MarketQualityEvaluation {
  const reasons: string[] = [];
  let score = 100;

  // 1. Market Lifecycle Status
  const marketStateOk = snapshot.marketState === "TRADING";
  if (!marketStateOk) {
    score -= 60;
    reasons.push(`Market lifecycle state is ${snapshot.marketState} (not actively trading)`);
  }

  // 2. Spread evaluation
  const spreadBps = snapshot.spreadBps ?? 9999;
  let spreadOk = false;
  if (spreadBps <= 300) {
    spreadOk = true;
  } else if (spreadBps <= 600) {
    spreadOk = true;
    score -= 20;
    reasons.push(`Moderate bid-ask spread (${spreadBps} bps)`);
  } else {
    score -= 40;
    reasons.push(`Excessive bid-ask spread (${spreadBps} bps exceeds 600 bps threshold)`);
  }

  // 3. Order Book Depth
  let totalVolume = 0;
  for (const bid of snapshot.yesBids) totalVolume += parseFloat(bid.quantity) || 0;
  for (const ask of snapshot.yesAsks) totalVolume += parseFloat(ask.quantity) || 0;

  let depthOk = false;
  if (totalVolume >= 50) {
    depthOk = true;
  } else if (totalVolume >= 10) {
    depthOk = true;
    score -= 15;
    reasons.push(`Low visible depth (${totalVolume.toFixed(1)} units)`);
  } else {
    score -= 35;
    reasons.push(`Thin liquidity (< 10 units resting on book)`);
  }

  // 4. Time remaining to expiry
  const minutesToExpiry = snapshot.secondsToExpiry / 60;
  let timeRemainingOk = false;
  if (minutesToExpiry > 30) {
    timeRemainingOk = true;
  } else if (minutesToExpiry > 5) {
    timeRemainingOk = true;
    score -= 20;
    reasons.push(`Imminent expiry (${Math.round(minutesToExpiry)} mins remaining)`);
  } else {
    score -= 50;
    reasons.push(`Critical expiry window (< 5 mins remaining, settlement lock near)`);
  }

  // Determine final state
  let state: MarketQualityState = "NO_TRADE";
  if (score >= 70 && marketStateOk && spreadOk && depthOk && timeRemainingOk) {
    state = "TRADEABLE";
    if (reasons.length === 0) reasons.push("Optimal liquidity, tight spread, and active trading window");
  } else if (score >= 40 && marketStateOk) {
    state = "WATCH";
  }

  return {
    state,
    score: Math.max(0, score),
    reasons,
    spreadOk,
    depthOk,
    timeRemainingOk,
    marketStateOk,
  };
}
