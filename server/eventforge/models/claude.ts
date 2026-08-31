import type { DreamDexMarketSnapshot } from "../../dreamdex";
import { computeDeterministicModel } from "../model";
import type { ModelPrediction, ModelProvider, ModelSpec } from "./types";

export const claudeSpec: ModelSpec = {
  id: "claude-3.5-sonnet",
  name: "Claude 3.5 Sonnet",
  family: "ANALYTICAL_LLM",
  provider: "Anthropic",
  description: "Analytical risk assessment model specializing in structural downside risk, market mechanics, and liquidity absorption.",
  badgeColor: "#f97316",
  avatarText: "C3",
};

export const claudeProvider: ModelProvider = {
  spec: claudeSpec,
  async predict(snapshot: DreamDexMarketSnapshot): Promise<ModelPrediction> {
    const start = Date.now();
    const baseline = computeDeterministicModel(snapshot);
    const midPercent = snapshot.midPercent ?? snapshot.lastPricePercent ?? 50;

    // Check for optional Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 500,
            messages: [
              {
                role: "user",
                content: `You are Claude 3.5 Sonnet analyzing Somnia DreamDEX market "${snapshot.question}". Mid: ${midPercent}%, Spread: ${baseline.spreadBps} bps, Imbalance: ${baseline.orderBookImbalance}. Return strictly JSON: { "probabilityPercent": number, "confidence": "LOW"|"MEDIUM"|"HIGH", "bullCase": string, "bearCase": string, "counterThesis": string, "keyRisks": string[] }`,
              },
            ],
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data.content[0].text;
          const parsed = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));
          const rawProb = typeof parsed.probabilityPercent === "number" ? parsed.probabilityPercent : midPercent;

          return {
            modelId: "claude-3.5-sonnet",
            modelName: claudeSpec.name,
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

    // Built-in structural analytical engine (100% free / offline)
    // Claude applies a risk-averse conservatism adjustment towards the center
    const conservativeAdjustmentBps = Math.round(baseline.orderBookImbalance * 260 * (1 - (baseline.spreadBps ?? 400) / 3000));
    const claudeProbabilityBps = Math.max(100, Math.min(9900, Math.round(midPercent * 100) + conservativeAdjustmentBps));

    return {
      modelId: "claude-3.5-sonnet",
      modelName: claudeSpec.name,
      probabilityBps: claudeProbabilityBps,
      confidence: baseline.modelConfidence,
      uncertaintyLevel: baseline.modelConfidence === "HIGH" ? "LOW" : "MODERATE",
      bullCase: `Balanced order flow microstructure maintains consistent support above ${snapshot.bestBidPercent ?? midPercent}%, creating favorable risk-adjusted asymmetry.`,
      bearCase: `Liquidity fragmentation across book depth may cause sudden slippage if rapid market orders trigger cascade across asks.`,
      counterThesis: `Observed spread widths suggest conservative institutional market-making rather than lack of fundamental conviction.`,
      keyRisks: [
        `Asymmetric bid exhaustion under sudden market selling.`,
        `Spread transaction friction (${baseline.spreadBps ?? "N/A"} bps).`,
        `Settlement oracle latency risk on event expiry.`,
      ],
      inferenceEngine: "BUILTIN_ANALYTICAL",
      latencyMs: Math.max(2, Date.now() - start),
      generatedAt: Date.now(),
    };
  },
};
