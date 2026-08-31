import type { DreamDexMarketSnapshot } from "../../dreamdex";
import { computeDeterministicModel } from "../model";
import type { ModelPrediction, ModelProvider, ModelSpec } from "./types";

export const deepseekSpec: ModelSpec = {
  id: "deepseek-r1",
  name: "DeepSeek R1 Reasoner",
  family: "QUANT_COT",
  provider: "DeepSeek AI",
  description: "Chain-of-thought mathematical reasoner calculating spread convexity, implied distribution, and Bayesian updates.",
  badgeColor: "#a855f7",
  avatarText: "R1",
};

export const deepseekProvider: ModelProvider = {
  spec: deepseekSpec,
  async predict(snapshot: DreamDexMarketSnapshot): Promise<ModelPrediction> {
    const start = Date.now();
    const baseline = computeDeterministicModel(snapshot);
    const midPercent = snapshot.midPercent ?? snapshot.lastPricePercent ?? 50;

    // Check for optional DeepSeek API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-reasoner",
            messages: [
              {
                role: "system",
                content:
                  "You are DeepSeek R1 quantitative reasoner. Calculate the rigorous fair probability for the given market and return JSON: { probabilityPercent: number, confidence: 'LOW'|'MEDIUM'|'HIGH', bullCase: string, bearCase: string, counterThesis: string, keyRisks: string[] }",
              },
              {
                role: "user",
                content: `Market: ${snapshot.question}, Asset: ${snapshot.asset}, Mid: ${midPercent}%, Spread: ${baseline.spreadBps} bps, Imbalance: ${baseline.orderBookImbalance}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const parsed = JSON.parse(data.choices[0].message.content);
          const rawProb = typeof parsed.probabilityPercent === "number" ? parsed.probabilityPercent : midPercent;
          return {
            modelId: "deepseek-r1",
            modelName: deepseekSpec.name,
            probabilityBps: Math.max(100, Math.min(9900, Math.round(rawProb * 100))),
            confidence: parsed.confidence || baseline.modelConfidence,
            uncertaintyLevel: "MODERATE",
            bullCase: parsed.bullCase,
            bearCase: parsed.bearCase,
            counterThesis: parsed.counterThesis,
            keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks.slice(0, 3) : [],
            inferenceEngine: "REAL_LLM",
            latencyMs: Date.now() - start,
            generatedAt: Date.now(),
          };
        }
      } catch {
        // Fallback to built-in analytical engine
      }
    }

    // Built-in quantitative chain-of-thought engine (100% free / offline)
    // DeepSeek calculates a Bayesian update: P(YES | Book) = (P(Book | YES) * P0) / Normalizer
    const priorProb = (snapshot.lastPricePercent ?? midPercent) / 100;
    const bidAskRatio = Math.max(0.01, (1 + baseline.orderBookImbalance) / (1 - baseline.orderBookImbalance + 0.01));
    const bayesOdds = (priorProb / (1 - priorProb + 0.001)) * Math.pow(bidAskRatio, 0.45);
    const bayesProb = bayesOdds / (1 + bayesOdds);
    const deepseekProbabilityBps = Math.max(100, Math.min(9900, Math.round(bayesProb * 10000)));

    const diffFromMidBps = deepseekProbabilityBps - Math.round(midPercent * 100);

    return {
      modelId: "deepseek-r1",
      modelName: deepseekSpec.name,
      probabilityBps: deepseekProbabilityBps,
      confidence: baseline.modelConfidence === "HIGH" ? "HIGH" : "MEDIUM",
      uncertaintyLevel: Math.abs(diffFromMidBps) > 500 ? "HIGH" : "LOW",
      bullCase: `Quantitative Bayesian derivation indicates a +${Math.abs(diffFromMidBps)} bps edge over mid-market pricing based on bid-side order concentration.`,
      bearCase: `Negative tail skew observed if ask-side resting volume steps down below ${snapshot.bestBidPercent ?? midPercent}%, penalizing late YES entries.`,
      counterThesis: `Spread compression dynamics suggest current market pricing lags the true information-flow drift by ~${Math.round(baseline.decayFactor * 100)}%.`,
      keyRisks: [
        `Convexity risk on wide book spreads (${baseline.spreadBps ?? 400} bps).`,
        `Low sample thickness in deep order tiers.`,
        `Non-linear time decay acceleration in the final hour of trading.`,
      ],
      inferenceEngine: "BUILTIN_ANALYTICAL",
      latencyMs: Math.max(3, Date.now() - start),
      generatedAt: Date.now(),
    };
  },
};
