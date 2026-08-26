import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
} from "drizzle-orm";
import {
  decisionReceipts,
  forecasts,
  forecastRevisions,
  marketSnapshots,
  receiptResolutions,
  type DecisionReceipt,
  type InsertForecast,
  type InsertMarketSnapshot,
} from "../drizzle/schema";
import type { DreamDexMarketSnapshot, DreamDexSnapshot } from "./dreamdex";
import { getDb } from "./db";
import { calculateCalibrationMetrics, scoreVerifiedOutcome, selectForecastAtResolution } from "./scoring";

export type CreateReceiptInput = Pick<
  InsertForecast,
  "marketId" | "direction" | "probabilityBps" | "confidence" | "thesis" | "counterThesis"
>;

export type ResolutionEvidenceInput = {
  receiptId: number;
  outcome: "YES" | "NO" | "VOID";
  sourceUrl: string;
  evidenceSummary: string;
};

export type ResolutionVerificationStatus = "VERIFIED" | "REJECTED";

export function hashEvidenceCommitment(outcome: ResolutionEvidenceInput["outcome"], sourceUrl: string, evidenceSummary: string): string {
  return createHash("sha256").update(JSON.stringify({ outcome, sourceUrl: sourceUrl.trim(), evidenceSummary: evidenceSummary.trim() })).digest("hex");
}

export function validateEvidenceSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());
  if (url.protocol !== "https:") throw new Error("Evidence source must use HTTPS");
  if (url.username || url.password) throw new Error("Evidence source cannot include credentials");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1" || hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("169.254.")) {
    throw new Error("Evidence source must be a public HTTPS URL");
  }
  return url.toString();
}

export function nextRevisionNumber(revisions: Array<Pick<typeof forecastRevisions.$inferSelect, "revisionNumber">>): number {
  return revisions.reduce((highest, row) => Math.max(highest, row.revisionNumber), 0) + 1;
}

export function isVerifiedResolution(resolution: Pick<typeof receiptResolutions.$inferSelect, "verificationStatus">): boolean {
  return resolution.verificationStatus === "VERIFIED";
}

export function revisionBelongsToUser(revision: Pick<typeof forecastRevisions.$inferSelect, "userId">, userId: number): boolean {
  return revision.userId === userId;
}

export function resolutionBelongsToUser(resolution: Pick<typeof receiptResolutions.$inferSelect, "userId">, userId: number): boolean {
  return resolution.userId === userId;
}

export function pickVerifiedOwnedResolution(userId: number, resolutions: Array<Pick<typeof receiptResolutions.$inferSelect, "userId" | "verificationStatus" | "outcome" | "verifiedAt" | "createdAt">>) {
  return resolutions.filter(item => resolutionBelongsToUser(item, userId)).find(item => item.verificationStatus === "VERIFIED");
}

export function filterOwnedReceiptRows<T extends { receipt: Pick<DecisionReceipt, "userId"> }>(rows: T[], userId: number): T[] {
  return rows.filter(row => receiptBelongsToUser(row.receipt, userId));
}

export function preservesOriginalForecast(originalForecastId: number, revision: Pick<typeof forecastRevisions.$inferSelect, "parentForecastId">): boolean {
  return revision.parentForecastId === originalForecastId;
}

type ReceiptDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function insertId(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const id = Number((header as { insertId?: number | bigint } | undefined)?.insertId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Database did not return an insert identifier");
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

async function receiptQuery(userId: number, receiptId?: number, database?: ReceiptDatabase) {
  const db = database ?? await getDb();
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

async function getReceiptTimeline(userId: number, receiptId: number, database?: ReceiptDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");

  const [revisions, resolutions] = await Promise.all([
    db.select().from(forecastRevisions).where(and(eq(forecastRevisions.receiptId, receiptId), eq(forecastRevisions.userId, userId))).orderBy(desc(forecastRevisions.revisionNumber)),
    db.select().from(receiptResolutions).where(and(eq(receiptResolutions.receiptId, receiptId), eq(receiptResolutions.userId, userId))).orderBy(desc(receiptResolutions.createdAt)),
  ]);

  return { revisions, resolutions };
}

export async function createDecisionReceipt(
  userId: number,
  input: CreateReceiptInput,
  snapshot: DreamDexSnapshot,
  database?: ReceiptDatabase,
) {
  const market = snapshot.markets.find(item => item.marketId === input.marketId);
  if (!market) throw new Error("Selected market was not present in the verified snapshot");
  if (snapshot.state !== "LIVE" || snapshot.asOf === null) throw new Error("A fresh verified market snapshot is required to create a receipt");
  if (market.marketState !== "TRADING") throw new Error("A receipt can only be committed while the selected market is trading");

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

export async function createForecastRevision(
  userId: number,
  receiptId: number,
  input: Omit<CreateReceiptInput, "marketId">,
  database?: ReceiptDatabase,
) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");

  await assertOwnedReceipt(db, userId, receiptId);
  const result = await db.transaction(async tx => {
    const currentRows = await tx
      .select({ receipt: decisionReceipts, forecast: forecasts })
      .from(decisionReceipts)
      .innerJoin(forecasts, eq(decisionReceipts.forecastId, forecasts.id))
      .where(and(eq(decisionReceipts.id, receiptId), eq(decisionReceipts.userId, userId)))
      .limit(1);
    const current = currentRows[0];
    if (!current) throw new Error("Decision Receipt not found");

    const priorRevisions = await tx.select({ revisionNumber: forecastRevisions.revisionNumber }).from(forecastRevisions).where(eq(forecastRevisions.receiptId, receiptId));
    const revisionNumber = nextRevisionNumber(priorRevisions);
    const forecastResult = await tx.insert(forecasts).values({ ...input, marketId: current.forecast.marketId, userId });
    const forecastId = insertId(forecastResult);

    await tx.update(forecasts).set({ status: "REVISED" }).where(and(eq(forecasts.id, current.forecast.id), eq(forecasts.userId, userId)));
    await tx.insert(forecastRevisions).values({
      receiptId,
      userId,
      parentForecastId: current.forecast.id,
      revisionNumber,
      ...input,
    });
    await tx.update(decisionReceipts).set({ forecastId, version: current.receipt.version + 1 }).where(and(eq(decisionReceipts.id, receiptId), eq(decisionReceipts.userId, userId)));
    return forecastId;
  });

  const updated = await getDecisionReceipt(userId, receiptId);
  if (!updated) throw new Error(`Receipt revision ${result} was created but could not be read back`);
  return updated;
}

async function assertOwnedReceipt(db: ReceiptDatabase, userId: number, receiptId: number) {
  const rows = await db.select({ receipt: decisionReceipts }).from(decisionReceipts).where(and(eq(decisionReceipts.id, receiptId), eq(decisionReceipts.userId, userId))).limit(1);
  if (!rows[0] || !receiptBelongsToUser(rows[0].receipt, userId)) throw new Error("Decision Receipt not found");
  return rows[0].receipt;
}

export async function submitResolutionEvidence(userId: number, input: ResolutionEvidenceInput, database?: ReceiptDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");
  await assertOwnedReceipt(db, userId, input.receiptId);

  const sourceUrl = validateEvidenceSourceUrl(input.sourceUrl);
  const result = await db.insert(receiptResolutions).values({
    receiptId: input.receiptId,
    userId,
    outcome: input.outcome,
    sourceUrl,
    evidenceSummary: input.evidenceSummary,
    evidenceHash: hashEvidenceCommitment(input.outcome, sourceUrl, input.evidenceSummary),
    hashAlgorithm: "SHA-256",
  });
  const id = insertId(result);
  const rows = await db.select().from(receiptResolutions).where(and(eq(receiptResolutions.id, id), eq(receiptResolutions.userId, userId))).limit(1);
  if (!rows[0]) throw new Error("Resolution evidence was created but could not be read back");
  return rows[0];
}

export async function listPendingResolutionEvidence(limit = 50, database?: ReceiptDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");
  return db
    .select({ resolution: receiptResolutions, receipt: decisionReceipts, forecast: forecasts, marketSnapshot: marketSnapshots })
    .from(receiptResolutions)
    .innerJoin(decisionReceipts, eq(receiptResolutions.receiptId, decisionReceipts.id))
    .innerJoin(forecasts, eq(decisionReceipts.forecastId, forecasts.id))
    .innerJoin(marketSnapshots, eq(decisionReceipts.marketSnapshotId, marketSnapshots.id))
    .where(eq(receiptResolutions.verificationStatus, "SUBMITTED"))
    .orderBy(asc(receiptResolutions.createdAt))
    .limit(limit);
}

export function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function buildCalibrationCsv(userId: number, database?: ReceiptDatabase) {
  const metrics = await getCalibrationMetrics(userId, database);
  const rows = [
    ["date", "verified_count", "directional_accuracy_pct", "mean_brier_score_bps"],
    ...metrics.trend.map(point => [point.date, point.verifiedCount, point.directionalAccuracyPct, point.meanBrierScoreBps]),
  ];
  return rows.map(row => row.map(cell => csvCell(cell)).join(",")).join("\\n") + "\\n";
}

export async function verifyResolutionEvidence(verifierId: number, resolutionId: number, status: ResolutionVerificationStatus, database?: ReceiptDatabase, reviewerNotes?: string) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");
  const existing = await db.select().from(receiptResolutions).where(eq(receiptResolutions.id, resolutionId)).limit(1);
  if (!existing[0]) throw new Error("Resolution evidence not found");
  if (existing[0].verificationStatus !== "SUBMITTED") throw new Error("Only submitted resolution evidence can be reviewed");

  await db.update(receiptResolutions).set({ verificationStatus: status, verifiedBy: String(verifierId), verifiedAt: new Date(), reviewerNotes: reviewerNotes?.trim() || null }).where(and(eq(receiptResolutions.id, resolutionId), eq(receiptResolutions.verificationStatus, "SUBMITTED")));
  const rows = await db.select().from(receiptResolutions).where(eq(receiptResolutions.id, resolutionId)).limit(1);
  if (!rows[0]) throw new Error("Resolution evidence review could not be read back");
  return rows[0];
}

export async function getCalibrationMetrics(userId: number, database?: ReceiptDatabase) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = filterOwnedReceiptRows(await receiptQuery(userId, undefined, db), userId);
  const scored = [];
  let excludedCount = 0;

  for (const row of rows) {
    const timeline = await getReceiptTimeline(userId, row.receipt.id, db);
    const verified = pickVerifiedOwnedResolution(userId, timeline.resolutions);
    let originalForecast = row.forecast;
    const firstRevision = timeline.revisions[timeline.revisions.length - 1];
    if (firstRevision) {
      const originalRows = await db.select().from(forecasts).where(and(eq(forecasts.id, firstRevision.parentForecastId), eq(forecasts.userId, userId))).limit(1);
      originalForecast = originalRows[0] ?? originalForecast;
    }
    const forecastAtResolution = verified ? selectForecastAtResolution(originalForecast, timeline.revisions, verified.verifiedAt ?? verified.createdAt ?? new Date()) : null;
    const score = verified && forecastAtResolution ? scoreVerifiedOutcome(row.receipt.id, forecastAtResolution, verified) : null;
    if (score && verified) scored.push({ ...score, resolvedAt: verified.verifiedAt ?? verified.createdAt ?? new Date() });
    else excludedCount += 1;
  }

  return calculateCalibrationMetrics(scored, excludedCount);
}

export async function listDecisionReceipts(userId: number, limit: number) {
  const rows = await receiptQuery(userId);
  return rows.slice(0, limit).map(shapeReceipt);
}

export async function getDecisionReceipt(userId: number, receiptId: number) {
  const rows = await receiptQuery(userId, receiptId);
  if (!rows[0] || !receiptBelongsToUser(rows[0].receipt, userId)) return null;
  const timeline = await getReceiptTimeline(userId, receiptId);
  return { ...shapeReceipt(rows[0]), ...timeline };
}
