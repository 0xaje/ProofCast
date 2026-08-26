import { and, desc, eq } from "drizzle-orm";
import {
  decisionReceipts,
  forecasts,
  marketSnapshots,
  type DecisionReceipt,
  type InsertForecast,
  type InsertMarketSnapshot,
} from "../drizzle/schema";
import type { DreamDexMarketSnapshot, DreamDexSnapshot } from "./dreamdex";
import { getDb } from "./db";

export type CreateReceiptInput = Pick<
  InsertForecast,
  "marketId" | "direction" | "probabilityBps" | "confidence" | "thesis" | "counterThesis"
>;

function insertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number | bigint } | undefined)?.insertId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Database did not return an insert identifier");
  }
  return id;
}

function toBasisPoints(percent: number | null): number | null {
  return percent === null ? null : Math.round(percent * 100);
}

export function receiptBelongsToUser(receipt: Pick<DecisionReceipt, "userId">, userId: number): boolean {
  return receipt.userId === userId;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function buildMarketSnapshotInsert(snapshot: DreamDexSnapshot, market: DreamDexMarketSnapshot): InsertMarketSnapshot {
  return {
    marketId: market.marketId,
    marketAddress: market.marketAddress,
    poolAddress: market.poolAddress,
    asset: market.asset,
    question: market.question,
    indexedStatus: market.indexedStatus,
    marketState: market.marketState,
    network: snapshot.network,
    chainId: snapshot.chainId,
    sourceAsOf: snapshot.asOf!,
    tradingStart: market.tradingStart,
    expiry: market.expiry,
    secondsToExpiry: market.secondsToExpiry,
    lastPriceBps: toBasisPoints(market.lastPricePercent),
    bestBidBps: toBasisPoints(market.bestBidPercent),
    bestAskBps: toBasisPoints(market.bestAskPercent),
    midBps: toBasisPoints(market.midPercent),
    spreadBps: market.spreadBps,
    provenanceJson: JSON.stringify(snapshot.provenance),
    orderBookJson: JSON.stringify({ yesBids: market.yesBids, yesAsks: market.yesAsks }),
  };
}

function shapeReceipt(row: {
  receipt: typeof decisionReceipts.$inferSelect;
  forecast: typeof forecasts.$inferSelect;
  marketSnapshot: typeof marketSnapshots.$inferSelect;
}) {
  return {
    ...row.receipt,
    forecast: row.forecast,
    marketSnapshot: {
      ...row.marketSnapshot,
      provenance: parseJson(row.marketSnapshot.provenanceJson),
      orderBook: parseJson(row.marketSnapshot.orderBookJson),
    },
  };
}

async function receiptQuery(userId: number, receiptId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  const filters = [eq(decisionReceipts.userId, userId)];
  if (receiptId !== undefined) filters.push(eq(decisionReceipts.id, receiptId));

  return db
    .select({ receipt: decisionReceipts, forecast: forecasts, marketSnapshot: marketSnapshots })
    .from(decisionReceipts)
    .innerJoin(forecasts, eq(decisionReceipts.forecastId, forecasts.id))
    .innerJoin(marketSnapshots, eq(decisionReceipts.marketSnapshotId, marketSnapshots.id))
    .where(and(...filters))
    .orderBy(desc(decisionReceipts.createdAt));
}

type ReceiptDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function createDecisionReceipt(
  userId: number,
  input: CreateReceiptInput,
  snapshot: DreamDexSnapshot,
  database?: ReceiptDatabase,
) {
  const market = snapshot.markets.find(item => item.marketId === input.marketId);
  if (!market) throw new Error("Selected market was not present in the verified snapshot");
  if (snapshot.state !== "LIVE" || snapshot.asOf === null) {
    throw new Error("A fresh verified market snapshot is required to create a receipt");
  }
  if (market.marketState !== "TRADING") {
    throw new Error("A receipt can only be committed while the selected market is trading");
  }

  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");

  const result = await db.transaction(async tx => {
    const snapshotResult = await tx.insert(marketSnapshots).values(buildMarketSnapshotInsert(snapshot, market));
    const marketSnapshotId = insertId(snapshotResult);
    const forecastResult = await tx.insert(forecasts).values({ ...input, userId });
    const forecastId = insertId(forecastResult);
    const receiptResult = await tx.insert(decisionReceipts).values({ userId, forecastId, marketSnapshotId });
    return insertId(receiptResult);
  });

  const created = await receiptQuery(userId, result);
  if (!created[0]) throw new Error("Receipt was created but could not be read back");
  return shapeReceipt(created[0]);
}

export async function listDecisionReceipts(userId: number, limit: number) {
  const rows = await receiptQuery(userId);
  return rows.slice(0, limit).map(shapeReceipt);
}

export async function getDecisionReceipt(userId: number, receiptId: number) {
  const rows = await receiptQuery(userId, receiptId);
  return rows[0] && receiptBelongsToUser(rows[0].receipt, userId) ? shapeReceipt(rows[0]) : null;
}
