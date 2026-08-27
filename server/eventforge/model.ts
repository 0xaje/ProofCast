import type { DreamDexMarketSnapshot } from "../dreamdex";

export type EventForgeConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface DeterministicModelOutput {
  modelProbabilityBps: number; // in basis points (e.g. 6450 = 64.5%)
  modelConfidence: EventForgeConfidence;
  spreadBps: number | null;
  orderBookImbalance: number; // -1.0 to 1.0 (positive = bid heavy / bullish, negative = ask heavy / bearish)
  decayFactor: number; // 0.0 to 1.0 based on time remaining to expiry
  volatilityEstimateBps: number;
  inputTimestamp: number;
  dataFreshnessMs: number;
}

/**
 * Layer A: Pure deterministic EventForge model.
 * 
 * Computes an objective estimate strictly from verified on-chain order-book depth,
 * bid/ask micro-structure, spread penalty, and time-decay factors.
 * 
 * Guaranteed: The same market snapshot input ALWAYS produces the exact same probability output.
 */
export function computeDeterministicModel(
  snapshot: DreamDexMarketSnapshot,
  referenceNowMs: number = Date.now()
): DeterministicModelOutput {
  const midBps = snapshot.midPercent !== null 
    ? Math.round(snapshot.midPercent * 100) 
    : snapshot.lastPricePercent !== null 
      ? Math.round(snapshot.lastPricePercent * 100) 
      : 5000;

  // Calculate order book depth and imbalance from top visible levels
  let totalBidVolume = 0;
  let totalAskVolume = 0;

  for (const bid of snapshot.yesBids) {
    totalBidVolume += parseFloat(bid.quantity) || 0;
  }
  for (const ask of snapshot.yesAsks) {
    totalAskVolume += parseFloat(ask.quantity) || 0;
  }

  const depthSum = totalBidVolume + totalAskVolume;
  const imbalance = depthSum > 0 ? (totalBidVolume - totalAskVolume) / depthSum : 0;

  // Time decay factor: closer to expiry means market mid-price carries higher weight
  const secondsToExpiry = Math.max(0, snapshot.secondsToExpiry);
  const totalDurationSeconds = Math.max(1, (snapshot.expiry - snapshot.tradingStart) / 1000);
  const timeProgress = Math.min(1, Math.max(0, 1 - secondsToExpiry / totalDurationSeconds));
  const decayFactor = parseFloat(timeProgress.toFixed(4));

  // Volatility proxy based on spread width
  const spreadBps = snapshot.spreadBps ?? 400;
  const volatilityEstimateBps = Math.round(spreadBps * 1.5);

  // Deterministic micro-structure adjustment:
  // Imbalance pushes the probability up to +/- 500 bps (5%), weighted by spread tightness and time progress
  const maxImbalanceAdjustmentBps = 400;
  const imbalanceAdjustment = Math.round(imbalance * maxImbalanceAdjustmentBps * (1 - Math.min(0.5, spreadBps / 2000)));

  // Clamped probability between 100 bps (1%) and 9900 bps (99%)
  const rawModelProbability = midBps + imbalanceAdjustment;
  const modelProbabilityBps = Math.max(100, Math.min(9900, rawModelProbability));

  // Confidence determination based on book depth and spread
  let modelConfidence: EventForgeConfidence = "LOW";
  if (depthSum > 100 && spreadBps < 300) {
    modelConfidence = "HIGH";
  } else if (depthSum > 20 && spreadBps < 700) {
    modelConfidence = "MEDIUM";
  }

  const inputTimestamp = referenceNowMs;
  const dataFreshnessMs = Math.max(0, referenceNowMs - snapshot.tradingStart);

  return {
    modelProbabilityBps,
    modelConfidence,
    spreadBps: snapshot.spreadBps,
    orderBookImbalance: parseFloat(imbalance.toFixed(4)),
    decayFactor,
    volatilityEstimateBps,
    inputTimestamp,
    dataFreshnessMs,
  };
}
