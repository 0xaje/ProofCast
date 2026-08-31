import type { DreamDexMarketSnapshot } from "../../dreamdex";
import { computeDeterministicModel } from "../model";
import type { ModelPrediction, ModelProvider, ModelSpec } from "./types";

export const geminiSpec: ModelSpec = {
  id: "gemini-1.5-flash",
  name: "Gemini 1.5 Reasoner",
  family: "REASONING_LLM",
  provider: "Google DeepMind",
  description: "Multimodal contextual model synthesizing macro momentum, order flow, and probabilistic game theory.",
  badgeColor: "#60a5fa",
  avatarText: "G1",
};

export const geminiProvider: ModelProvider = {
  spec: geminiSpec,
  async predict(snapshot: DreamDexMarketSnapshot): Promise<ModelPrediction> {
    const start = Date.now();
    const baseline = computeDeterministicModel(snapshot);
    const midPercent = snapshot.midPercent ?? snapshot.lastPricePercent ?? 50;

    // Check for optional Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are Gemini 1.5 Reasoner, evaluating a Somnia DreamDEX binary prediction market.
Market Question: "${snapshot.question}"
Asset: ${snapshot.asset}
Market Mid-Price: ${midPercent}%
Spread: ${baseline.spreadBps ?? "N/A"} bps
Time to Expiry: ${Math.round(snapshot.secondsToExpiry / 60)} minutes
Order Book Imbalance: ${(baseline.orderBookImbalance * 100).toFixed(1)}%

Provide your probability estimate (in % from 1 to 99) and reasoning.
Format strictly as JSON:
{
  "probabilityPercent": number,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "uncertaintyLevel": "LOW" | "MODERATE" | "HIGH" | "EXTREME",
  "bullCase": "1 concise sentence",
  "bearCase": "1 concise sentence",
  "counterThesis": "1 concise sentence",
  "keyRisks": ["risk 1", "risk 2", "risk 3"]
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          const rawProb = typeof parsed.probabilityPercent === "number" ? parsed.probabilityPercent : midPercent;
          const probBps = Math.max(100, Math.min(9900, Math.round(rawProb * 100)));

          return {
            modelId: "gemini-1.5-flash",
            modelName: geminiSpec.name,
            probabilityBps: probBps,
            confidence: parsed.confidence || baseline.modelConfidence,
            uncertaintyLevel: parsed.uncertaintyLevel || "MODERATE",
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

    // Built-in high-fidelity analytical engine (100% free / offline)
    // Gemini models apply a macro-smoothing prior to the micro-structure adjustment
    const macroPriorBps = Math.round(midPercent * 100);
    const microAdjustmentBps = Math.round(baseline.orderBookImbalance * 320);
    const geminiProbabilityBps = Math.max(100, Math.min(9900, macroPriorBps + microAdjustmentBps));

    return {
      modelId: "gemini-1.5-flash",
      modelName: geminiSpec.name,
      probabilityBps: geminiProbabilityBps,
      confidence: baseline.modelConfidence,
      uncertaintyLevel: baseline.spreadBps && baseline.spreadBps > 400 ? "HIGH" : "MODERATE",
      bullCase: `Structural order book depth favors YES outcome with ${((baseline.orderBookImbalance + 1) * 50).toFixed(0)}% relative bid density against resting ask pressure.`,
      bearCase: `Thin liquidity across outer tiers risks sharp downside gap if broader ${snapshot.asset} trend reverses before settlement.`,
      counterThesis: `Market participants are pricing elevated volatility premium into the spread, creating an asymmetric risk/reward edge for disciplined forecasters.`,
      keyRisks: [
        `Bid-ask spread crossing friction (${baseline.spreadBps ?? 400} bps).`,
        `Macro asset volatility regime shift for ${snapshot.asset}.`,
        `Terminal liquidity cliff approaching contract expiry.`,
      ],
      inferenceEngine: "BUILTIN_ANALYTICAL",
      latencyMs: Math.max(2, Date.now() - start),
      generatedAt: Date.now(),
    };
  },
};
