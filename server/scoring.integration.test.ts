import { describe, expect, it } from "vitest";
import { decisionReceipts, forecasts, marketSnapshots, receiptResolutions } from "../drizzle/schema";
import { getCalibrationMetrics } from "./receipts";

const ownedReceipt = {
  receipt: { id: 1, userId: 7, forecastId: 10, marketSnapshotId: 20, version: 1, createdAt: new Date() },
  forecast: { id: 10, userId: 7, marketId: "market-1", direction: "UP", probabilityBps: 8_000, confidence: "HIGH", thesis: "owned", counterThesis: "risk", status: "COMMITTED", committedAt: new Date() },
  marketSnapshot: { id: 20, marketId: "market-1", marketState: "TRADING", provenanceJson: "{}", orderBookJson: "{}" },
};

const foreignReceipt = { ...ownedReceipt, receipt: { ...ownedReceipt.receipt, id: 2, userId: 8 }, forecast: { ...ownedReceipt.forecast, id: 11, userId: 8 } };

function databaseFixture() {
  const resolutions = [
    { id: 31, receiptId: 1, userId: 7, outcome: "YES", verificationStatus: "VERIFIED" },
    { id: 32, receiptId: 1, userId: 8, outcome: "NO", verificationStatus: "VERIFIED" },
  ];
  return {
    select: (selection?: unknown) => ({
      from: (table: unknown) => {
        if (selection) {
          const receiptQuery = {
            innerJoin: () => receiptQuery,
            where: () => ({ orderBy: async () => [ownedReceipt, foreignReceipt] }),
          };
          return receiptQuery;
        }
        return { where: () => ({ orderBy: async () => table === receiptResolutions ? resolutions : [] }) };
      },
    }),
  };
}

describe("calibration aggregation ownership", () => {
  it("only scores the authenticated user’s receipts and resolutions", async () => {
    const metrics = await getCalibrationMetrics(7, databaseFixture() as never);
    expect(metrics.verifiedCount).toBe(1);
    expect(metrics.excludedCount).toBe(0);
    expect(metrics.directionalAccuracyPct).toBe(100);
    expect(metrics.meanBrierScoreBps).toBe(400);
  });
});
