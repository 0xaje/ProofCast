import type { DreamDexMarketSnapshot } from "./dreamdex";

export interface ExecutableEdgeCalculation {
  userForecastBps: number;
  marketMidBps: number;
  modelEstimateBps: number;
  
  // Subjective gap (belief vs headline mid-price)
  subjectiveThesisGapBps: number;
  
  // Model divergence (belief vs EventForge model)
  modelDivergenceBps: number;
  
  // Real execution metrics
  executablePriceBps: number;
  spreadCostBps: number;
  estimatedSlippageBps: number;
  
  // True executable edge (user probability - executable price)
  executableEdgeBps: number;
  isExecutableEdgePositive: boolean;
  explanation: string;
}

/**
 * Priority 6: Executable Edge Engine.
 * 
 * Accurately distinguishes between:
 * 1. "Subjective Thesis Gap" (difference between user belief and the mid market price)
 * 2. "True Executable Edge" (difference after accounting for crossing the spread, slippage, and execution fees)
 */
export function calculateExecutableEdge(
  userForecastBps: number,
  direction: "UP" | "DOWN",
  snapshot: DreamDexMarketSnapshot,
  modelEstimateBps: number
): ExecutableEdgeCalculation {
  const marketMidBps = snapshot.midPercent !== null 
    ? Math.round(snapshot.midPercent * 100) 
    : snapshot.lastPricePercent !== null 
      ? Math.round(snapshot.lastPricePercent * 100) 
      : 5000;

  const bestAskBps = snapshot.bestAskPercent !== null ? Math.round(snapshot.bestAskPercent * 100) : marketMidBps + 200;
  const bestBidBps = snapshot.bestBidPercent !== null ? Math.round(snapshot.bestBidPercent * 100) : marketMidBps - 200;

  const subjectiveThesisGapBps = direction === "UP"
    ? userForecastBps - marketMidBps
    : marketMidBps - userForecastBps;

  const modelDivergenceBps = userForecastBps - modelEstimateBps;

  // Real executable price depending on direction
  let executablePriceBps: number;
  let spreadCostBps: number;

  if (direction === "UP") {
    // To go UP (buy YES), user must cross the book to hit the Ask
    executablePriceBps = bestAskBps;
    spreadCostBps = Math.max(0, bestAskBps - marketMidBps);
  } else {
    // To go DOWN (buy NO), user enters NO at (100% - Bid)
    executablePriceBps = 10000 - bestBidBps;
    spreadCostBps = Math.max(0, marketMidBps - bestBidBps);
  }

  // Estimated standard slippage cushion (e.g. 50 bps)
  const estimatedSlippageBps = snapshot.spreadBps && snapshot.spreadBps > 400 ? 75 : 30;

  // True executable edge = expected payout probability - actual cost to enter
  const effectiveEntryCostBps = executablePriceBps + estimatedSlippageBps;
  const effectiveExpectedBps = direction === "UP" ? userForecastBps : (10000 - userForecastBps);
  
  const executableEdgeBps = effectiveExpectedBps - effectiveEntryCostBps;
  const isExecutableEdgePositive = executableEdgeBps > 0;

  let explanation: string;
  if (isExecutableEdgePositive) {
    explanation = `Positive executable edge of +${(executableEdgeBps / 100).toFixed(2)}% remains after absorbing ${(spreadCostBps / 100).toFixed(2)}% spread crossing and estimated ${(estimatedSlippageBps / 100).toFixed(2)}% slippage.`;
  } else {
    explanation = `Subjective gap is ${(subjectiveThesisGapBps / 100).toFixed(2)}%, but crossing the ask price (${(executablePriceBps / 100).toFixed(2)}%) leaves a negative executable edge of ${(executableEdgeBps / 100).toFixed(2)}%.`;
  }

  return {
    userForecastBps,
    marketMidBps,
    modelEstimateBps,
    subjectiveThesisGapBps,
    modelDivergenceBps,
    executablePriceBps,
    spreadCostBps,
    estimatedSlippageBps,
    executableEdgeBps,
    isExecutableEdgePositive,
    explanation,
  };
}
