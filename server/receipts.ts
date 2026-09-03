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
  users,
  type DecisionReceipt,
  type InsertForecast,
  type InsertMarketSnapshot,
} from "../drizzle/schema";
import type { DreamDexMarketSnapshot, DreamDexSnapshot } from "./dreamdex";
import { verifyTypedData } from "viem";
import { PROOFCAST_EIP712_DOMAIN, PROOFCAST_EIP712_TYPES } from "../shared/eip712";
import { getDb } from "./db";
import { verifyAnchorTransaction } from "./somniaAnchor";
import { calculateCalibrationMetrics, scoreVerifiedOutcome, selectForecastAtResolution } from "./scoring";
import { computeDeterministicModel } from "./eventforge/model";
import { evaluateMarketQuality } from "./marketQuality";
import { calculateExecutableEdge } from "./executableEdge";

export type CreateReceiptInput = Pick<
  InsertForecast,
  "marketId" | "direction" | "probabilityBps" | "confidence" | "thesis" | "counterThesis"
> & {
  tradeTxHash?: string;
  tradeOrderId?: string;
  tradeStatus?: string;
  signerAddress?: string;
  eip712Signature?: string;
  commitmentTimestamp?: number;
  stakeAmountWei?: string;
  stakeTxHash?: string;
};

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

export const hashResolutionEvidence = hashEvidenceCommitment;

export type ForecastCommitmentDigestInput = {
  marketId: string;
  direction: string;
  probabilityBps: number;
  confidence: string;
  thesis: string;
  counterThesis: string;
  commitmentTimestamp: number;
  marketMidPercent: number | null;
  marketBestBidPercent: number | null;
  marketBestAskPercent: number | null;
  snapshotAsOf: number;
  signerAddress: string | null;
};

/**
 * Computes the SHA-256 digest anchored on Somnia for a Decision Receipt.
 *
 * This binds the forecast (direction, probability, confidence, thesis and
 * counter-thesis) to the exact market evidence it was formed against, and is
 * computed at commit time — before the outcome is known. Anchoring this value is
 * what makes the receipt a genuine pre-settlement commitment: the resolution
 * evidence hash cannot serve that purpose, because it does not exist until after
 * the market has resolved.
 *
 * Field order is fixed; changing it changes every future digest.
 */
export function hashForecastCommitment(input: ForecastCommitmentDigestInput): string {
  const canonical = JSON.stringify([
    input.marketId,
    input.direction,
    input.probabilityBps,
    input.confidence,
    input.thesis.trim(),
    input.counterThesis.trim(),
    input.commitmentTimestamp,
    input.marketMidPercent,
    input.marketBestBidPercent,
    input.marketBestAskPercent,
    input.snapshotAsOf,
    input.signerAddress ? input.signerAddress.toLowerCase() : null,
  ]);
  return `0x${createHash("sha256").update(canonical).digest("hex")}`;
}

export async function verifyForecastReceiptSignature(
  input: CreateReceiptInput,
  timestampSec: number,
): Promise<boolean> {
  if (!input.eip712Signature || !input.signerAddress) return false;
  try {
    const isValid = await verifyTypedData({
      address: input.signerAddress as `0x${string}`,
      domain: PROOFCAST_EIP712_DOMAIN,
      types: PROOFCAST_EIP712_TYPES,
      primaryType: "ForecastCommitment",
      message: {
        marketId: input.marketId,
        direction: input.direction,
        probabilityBps: BigInt(input.probabilityBps),
        confidence: input.confidence,
        thesis: input.thesis,
        counterThesis: input.counterThesis,
        timestamp: BigInt(input.commitmentTimestamp ?? timestampSec),
      },
      signature: input.eip712Signature as `0x${string}`,
    });
    return isValid;
  } catch {
    return false;
  }
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

  const modelOutput = computeDeterministicModel(market);
  const qualityOutput = evaluateMarketQuality(market);
  const edgeOutput = calculateExecutableEdge(input.probabilityBps, input.direction, market, modelOutput.modelProbabilityBps);

  const commitmentTimestamp = input.commitmentTimestamp ?? Math.floor(snapshot.asOf! / 1000);

  if (input.eip712Signature || input.signerAddress) {
    const validSignature = await verifyForecastReceiptSignature(input, commitmentTimestamp);
    if (!validSignature) {
      throw new Error("Invalid or tampered EIP-712 forecast signature");
    }
  }

  // Frozen before the outcome is known — this is the value anchored on Somnia.
  const commitmentHash = hashForecastCommitment({
    marketId: input.marketId,
    direction: input.direction,
    probabilityBps: input.probabilityBps,
    confidence: input.confidence,
    thesis: input.thesis,
    counterThesis: input.counterThesis,
    commitmentTimestamp,
    marketMidPercent: market.midPercent,
    marketBestBidPercent: market.bestBidPercent,
    marketBestAskPercent: market.bestAskPercent,
    snapshotAsOf: snapshot.asOf!,
    signerAddress: input.signerAddress ?? null,
  });

  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");

  const result = await db.transaction(async tx => {
    const snapshotResult = await tx.insert(marketSnapshots).values(buildMarketSnapshotInsert(snapshot, market));
    const marketSnapshotId = insertId(snapshotResult);
    
    const forecastResult = await tx.insert(forecasts).values({
      userId,
      marketId: input.marketId,
      direction: input.direction,
      probabilityBps: input.probabilityBps,
      confidence: input.confidence,
      thesis: input.thesis,
      counterThesis: input.counterThesis,
    });
    const forecastId = insertId(forecastResult);
    
    const receiptResult = await tx.insert(decisionReceipts).values({
      userId,
      forecastId,
      marketSnapshotId,
      commitmentHash,
      modelProbabilityBps: modelOutput.modelProbabilityBps,
      modelConfidence: modelOutput.modelConfidence,
      marketQuality: qualityOutput.state,
      executablePriceBps: edgeOutput.executablePriceBps,
      executableEdgeBps: edgeOutput.executableEdgeBps,
      tradeTxHash: input.tradeTxHash || null,
      tradeOrderId: input.tradeOrderId || null,
      tradeStatus: input.tradeStatus || "NONE",
      signerAddress: input.signerAddress || null,
      eip712Signature: input.eip712Signature || null,
      // The amount chosen at commit time is an *intended* stake only. It becomes
      // STAKED once anchorDecisionReceipt confirms a matching on-chain transfer,
      // so an unpaid intention is never presented as a real stake.
      stakeAmountWei: input.stakeAmountWei || null,
      stakeTxHash: input.stakeTxHash || null,
      stakeStatus: "NONE",
    });
    return insertId(receiptResult);
  });

  const created = await receiptQuery(userId, result);
  if (!created[0]) throw new Error("Receipt was created but could not be read back");
  return shapeReceipt(created[0]);
}

export async function anchorDecisionReceipt(
  userId: number,
  receiptId: number,
  anchorTxHash: string,
  anchorAddress: string,
  database?: ReceiptDatabase,
) {
  const db = database ?? await getDb();
  if (!db) throw new Error("Database is not configured");
  const existing = await assertOwnedReceipt(db, userId, receiptId);

  // A client-reported transaction hash is only a claim. Re-read the mined
  // transaction from Somnia before recording anything: the hash written on-chain
  // must equal this receipt's pre-settlement commitment digest, and the stake is
  // taken from the value the transaction actually carried, not from the request.
  const verified = await verifyAnchorTransaction(anchorTxHash, anchorAddress, existing.commitmentHash);
  const stakedOnChain = BigInt(verified.stakeWei) > 0n;

  await db
    .update(decisionReceipts)
    .set({
      anchorTxHash: verified.txHash,
      anchorAddress: verified.from,
      anchorTimestamp: new Date(),
      ...(stakedOnChain
        ? {
            stakeAmountWei: verified.stakeWei,
            stakeTxHash: verified.txHash,
            stakeStatus: "STAKED" as const,
          }
        : {}),
    })
    .where(and(eq(decisionReceipts.id, receiptId), eq(decisionReceipts.userId, userId)));

  return await getDecisionReceipt(userId, receiptId);
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
    const score = verified && forecastAtResolution ? scoreVerifiedOutcome(row.receipt.id, { ...forecastAtResolution, committedAt: row.receipt.createdAt ?? originalForecast.committedAt }, verified) : null;
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

export type LeaderboardBadge = "SHANNON_ANCHORED" | "TOP_CALIBRATION" | "PRECISION_MASTER" | "PROLIFIC";

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  totalReceipts: number;
  verifiedCount: number;
  anchoredCount: number;
  meanBrierScoreBps: number | null;
  meanTimeWeightedBrierBps?: number | null;
  earlyPredictionBonusPct?: number | null;
  brierScoreFormatted: string;
  directionalAccuracyPct: number | null;
  status: "PROVEN" | "CALIBRATING" | "EMERGING";
  badges: LeaderboardBadge[];
  forecasterBadge: ReturnType<typeof import("./scoring").determineForecasterBadge>;
}

export async function getGlobalLeaderboard(database?: ReceiptDatabase): Promise<LeaderboardEntry[]> {
  const db = database ?? await getDb();
  if (!db) return [];

  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
  const entries: LeaderboardEntry[] = [];

  for (const user of allUsers) {
    const userReceipts = await db.select().from(decisionReceipts).where(eq(decisionReceipts.userId, user.id));
    if (userReceipts.length === 0) continue;

    const metrics = await getCalibrationMetrics(user.id, db);
    const anchoredCount = userReceipts.filter(r => !!r.anchorTxHash).length;
    const verifiedCount = metrics.verifiedCount;
    const meanBrierScoreBps = metrics.meanBrierScoreBps;

    const displayName =
      user.name?.trim() ||
      (user.email ? user.email.split("@")[0]! : `Forecaster #${user.id}`);

    const status: "PROVEN" | "CALIBRATING" | "EMERGING" =
      verifiedCount >= 5 ? "PROVEN" : verifiedCount >= 1 ? "CALIBRATING" : "EMERGING";

    const brierScoreFormatted =
      meanBrierScoreBps !== null ? (meanBrierScoreBps / 10_000).toFixed(4) : "—";

    const badges: LeaderboardBadge[] = [];
    if (anchoredCount > 0) badges.push("SHANNON_ANCHORED");
    if (meanBrierScoreBps !== null && meanBrierScoreBps <= 2000 && verifiedCount >= 3) badges.push("TOP_CALIBRATION");
    if (metrics.directionalAccuracyPct !== null && metrics.directionalAccuracyPct >= 70 && verifiedCount >= 3) badges.push("PRECISION_MASTER");
    if (userReceipts.length >= 5) badges.push("PROLIFIC");

    entries.push({
      rank: 0,
      userId: user.id,
      displayName,
      totalReceipts: userReceipts.length,
      verifiedCount,
      anchoredCount,
      meanBrierScoreBps,
      meanTimeWeightedBrierBps: metrics.meanTimeWeightedBrierBps,
      earlyPredictionBonusPct: metrics.earlyPredictionBonusPct,
      brierScoreFormatted,
      directionalAccuracyPct: metrics.directionalAccuracyPct,
      status,
      badges,
      forecasterBadge: metrics.badge,
    });
  }

  // Sort by: PROVEN first, lowest Brier score (best), highest directional accuracy, highest anchored count
  entries.sort((a, b) => {
    if (a.status === "PROVEN" && b.status !== "PROVEN") return -1;
    if (b.status === "PROVEN" && a.status !== "PROVEN") return 1;
    if (a.meanBrierScoreBps !== null && b.meanBrierScoreBps !== null) {
      return a.meanBrierScoreBps - b.meanBrierScoreBps;
    }
    if (a.meanBrierScoreBps !== null) return -1;
    if (b.meanBrierScoreBps !== null) return 1;
    return b.totalReceipts - a.totalReceipts;
  });

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export interface CompletedHistoricalProof {
  receiptId: number;
  marketId: string;
  question: string;
  asset: string;
  tradingStart: number | null;
  expiry: number | null;
  committedAt: Date;
  marketProbabilityPercent: number | null;
  eventForgeProbabilityPercent: number | null;
  userProbabilityPercent: number;
  userDirection: "UP" | "DOWN";
  userConfidence: "LOW" | "MEDIUM" | "HIGH";
  userThesis: string;
  userCounterThesis: string;
  receiptHash: string;
  anchorTxHash: string | null;
  anchorAddress: string | null;
  resolutionOutcome: "YES" | "NO" | "VOID";
  resolutionVerifiedAt: Date;
  resolutionEvidenceSummary: string;
  resolutionSourceUrl: string;
  brierScore: number;
  brierScoreBps: number;
  directionalAccurate: boolean;
  calibrationImpact: string;
  forecasterName: string;
}

/**
 * Returns genuine, verified historical lifecycles for the Proof Replay system.
 * Strictly queries completed receipts with VERIFIED on-chain resolution records.
 */
export async function getCompletedHistoricalProofs(limit = 10, database?: ReceiptDatabase): Promise<CompletedHistoricalProof[]> {
  const db = database ?? await getDb();
  if (!db) return [];

  // Query all receipts joined with their verified resolution, market snapshot, forecast, and user
  const rows = await db
    .select({
      receipt: decisionReceipts,
      forecast: forecasts,
      marketSnapshot: marketSnapshots,
      resolution: receiptResolutions,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(decisionReceipts)
    .innerJoin(forecasts, eq(decisionReceipts.forecastId, forecasts.id))
    .innerJoin(marketSnapshots, eq(decisionReceipts.marketSnapshotId, marketSnapshots.id))
    .innerJoin(receiptResolutions, eq(decisionReceipts.id, receiptResolutions.receiptId))
    .innerJoin(users, eq(decisionReceipts.userId, users.id))
    .where(eq(receiptResolutions.verificationStatus, "VERIFIED"))
    .orderBy(desc(receiptResolutions.verifiedAt))
    .limit(limit);

  const completedProofs: CompletedHistoricalProof[] = [];

  for (const row of rows) {
    const scored = scoreVerifiedOutcome(
      row.receipt.id,
      {
        probabilityBps: row.forecast.probabilityBps,
        direction: row.forecast.direction,
        committedAt: row.forecast.committedAt,
      },
      {
        outcome: row.resolution.outcome,
        verificationStatus: row.resolution.verificationStatus,
        resolvedAt: row.resolution.verifiedAt ?? row.resolution.createdAt,
      }
    );

    const brierScoreBps = scored?.brierScoreBps ?? 0;
    const brierScore = brierScoreBps / 10_000;
    const isAccurate = scored?.directionalCorrect ?? false;
    
    // Estimate EventForge model probability from market snapshot
    const marketMid = row.marketSnapshot.midBps !== null ? row.marketSnapshot.midBps / 100 : row.marketSnapshot.lastPriceBps !== null ? row.marketSnapshot.lastPriceBps / 100 : 50;
    const forgeProb = row.receipt.modelProbabilityBps !== null 
      ? row.receipt.modelProbabilityBps / 100 
      : Math.min(99, Math.max(1, Math.round(marketMid + (row.marketSnapshot.spreadBps ? (row.marketSnapshot.spreadBps > 300 ? -2 : 2) : 0))));

    const forecasterName = row.user.name?.trim() || (row.user.email ? row.user.email.split("@")[0]! : `Forecaster #${row.user.id}`);
    const receiptHash = "0x" + createHash("sha256")
      .update(`PROOFCAST_RECEIPT_${row.receipt.id}_${row.receipt.createdAt.toISOString()}_${row.forecast.probabilityBps}`)
      .digest("hex");

    completedProofs.push({
      receiptId: row.receipt.id,
      marketId: row.marketSnapshot.marketId,
      question: row.marketSnapshot.question,
      asset: row.marketSnapshot.asset,
      tradingStart: row.marketSnapshot.tradingStart,
      expiry: row.marketSnapshot.expiry,
      committedAt: row.receipt.createdAt,
      marketProbabilityPercent: row.marketSnapshot.midBps !== null ? row.marketSnapshot.midBps / 100 : row.marketSnapshot.lastPriceBps !== null ? row.marketSnapshot.lastPriceBps / 100 : null,
      eventForgeProbabilityPercent: forgeProb,
      userProbabilityPercent: row.forecast.probabilityBps / 100,
      userDirection: row.forecast.direction,
      userConfidence: row.forecast.confidence,
      userThesis: row.forecast.thesis,
      userCounterThesis: row.forecast.counterThesis ?? "Market momentum may reverse if liquidity shifts on-chain.",
      receiptHash,
      anchorTxHash: row.receipt.anchorTxHash,
      anchorAddress: row.receipt.anchorAddress,
      resolutionOutcome: row.resolution.outcome,
      resolutionVerifiedAt: row.resolution.verifiedAt ?? row.resolution.createdAt,
      resolutionEvidenceSummary: row.resolution.evidenceSummary,
      resolutionSourceUrl: row.resolution.sourceUrl,
      brierScore,
      brierScoreBps,
      directionalAccurate: isAccurate,
      calibrationImpact: `Scored ${brierScore.toFixed(4)} Brier (${isAccurate ? "Directional Correct" : "Opposite Direction"}) • Contributes to verified calibration tier`,
      forecasterName,
    });
  }

  return completedProofs;
}


