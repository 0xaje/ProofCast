import { describe, expect, it, vi } from "vitest";
import { receiptResolutions } from "../drizzle/schema";

const ownedReceipt = {
  receipt: { id: 1, userId: 7, forecastId: 10, marketSnapshotId: 20, version: 1, createdAt: new Date() },
  forecast: { id: 10, userId: 7, marketId: "market-1", direction: "UP", probabilityBps: 8_000, confidence: "HIGH", thesis: "owned", counterThesis: "risk", status: "COMMITTED", committedAt: new Date() },
  marketSnapshot: { id: 20, marketId: "market-1", marketState: "TRADING", provenanceJson: "{}", orderBookJson: "{}" },
};

function databaseFixture() {
  const resolutions = [{ id: 31, receiptId: 1, userId: 7, outcome: "YES", verificationStatus: "VERIFIED" }];
  return {
    select: (selection?: unknown) => ({
      from: (table: unknown) => {
        if (selection) {
          const receiptQuery = {
            innerJoin: () => receiptQuery,
            where: () => ({ orderBy: async () => [ownedReceipt] }),
          };
          return receiptQuery;
        }
        return { where: () => ({ orderBy: async () => table === receiptResolutions ? resolutions : [] }) };
      },
    }),
  };
}

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getDb: vi.fn().mockResolvedValue(databaseFixture()) };
});

import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 7, role: "user" } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("protected calibration metrics API", () => {
  it("returns real verified non-void scoring metrics through the protected procedure", async () => {
    const metrics = await appRouter.createCaller(authenticatedContext()).receipts.metrics();
    expect(metrics).toMatchObject({ verifiedCount: 1, excludedCount: 0, directionalAccuracyPct: 100, meanBrierScoreBps: 400 });
    expect(metrics.calibrationStatus).toBe("INSUFFICIENT_SAMPLE");
    expect(metrics.bins.find(bin => bin.count === 1)).toMatchObject({ predictedBps: 8_000, observedBps: 10_000 });
  });
});
