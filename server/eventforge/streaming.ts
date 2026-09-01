import type { Request, Response } from "express";
import { getDreamDexSnapshot } from "../dreamdex";
import { computeDeterministicModel } from "./model";
import { generateEventForgeReasoning } from "./reasoning";
import { evaluateMarketQuality } from "../marketQuality";

/**
 * Server-Sent Events (SSE) streaming endpoint for EventForge model reasoning.
 * Emits real-time reasoning tokens to give visitors responsive, live inference feedback.
 */
export async function handleEventForgeStream(req: Request, res: Response): Promise<void> {
  const marketId = (req.query.marketId as string)?.trim();
  if (!marketId) {
    res.status(400).json({ error: "Missing marketId query parameter" });
    return;
  }

  // Set SSE streaming headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const snapshot = await getDreamDexSnapshot(6);
    const market = snapshot.markets.find(m => m.marketId === marketId);
    if (!market) {
      sendEvent({ type: "error", message: "Market not found in verified snapshot" });
      res.end();
      return;
    }

    sendEvent({ type: "status", message: "Analyzing Somnia DreamDEX order-book depth..." });

    const model = computeDeterministicModel(market);
    const quality = evaluateMarketQuality(market);

    sendEvent({
      type: "model_stats",
      probabilityBps: model.modelProbabilityBps,
      confidence: model.modelConfidence,
      spreadBps: model.spreadBps,
      quality: quality.state,
    });

    const reasoning = await generateEventForgeReasoning(market, model);

    // Stream reasoning in chunks for progressive real-time delivery
    const sections = [
      { key: "bullCase", title: "BULL THESIS", content: reasoning.bullCase },
      { key: "bearCase", title: "BEAR CASE", content: reasoning.bearCase },
      { key: "counterThesis", title: "COUNTER-THESIS", content: reasoning.counterThesis },
      { key: "disagreementAnalysis", title: "MARKET DISAGREEMENT", content: reasoning.disagreementAnalysis },
    ];

    for (const sec of sections) {
      sendEvent({ type: "section_start", section: sec.key, title: sec.title });
      const words = sec.content.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        const tokenChunk = words.slice(i, i + 3).join(" ") + " ";
        sendEvent({ type: "token", section: sec.key, token: tokenChunk });
        await new Promise(r => setTimeout(r, 25));
      }
      sendEvent({ type: "section_end", section: sec.key });
    }

    sendEvent({
      type: "complete",
      payload: {
        model,
        reasoning,
        quality,
      },
    });

    res.end();
  } catch (err) {
    sendEvent({
      type: "error",
      message: err instanceof Error ? err.message : "Streaming inference error",
    });
    res.end();
  }
}
