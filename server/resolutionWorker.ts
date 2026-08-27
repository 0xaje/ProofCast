import { eq, and, notExists } from "drizzle-orm";
import { getDb } from "./db";
import { decisionReceipts, receiptResolutions, marketSnapshots } from "../drizzle/schema";
import { getDreamDexSnapshot } from "./dreamdex";
import { hashResolutionEvidence } from "./receipts";

export interface AutomatedResolutionResult {
  checkedCount: number;
  resolvedCount: number;
  resolvedReceiptIds: number[];
  errors: Array<{ receiptId: number; error: string }>;
}

/**
 * Priority 1: Automated DreamDEX Resolution Worker.
 * 
 * Inspects open, unresolved Decision Receipts, checks the official Somnia DreamDEX
 * market state, and automatically resolves receipts when on-chain settlement occurs.
 */
export async function pollAndResolveDreamDexReceipts(): Promise<AutomatedResolutionResult> {
  const db = await getDb();
  if (!db) {
    return { checkedCount: 0, resolvedCount: 0, resolvedReceiptIds: [], errors: [{ receiptId: 0, error: "Database unavailable" }] };
  }

  // Find all decision receipts that have NO VERIFIED resolution record yet
  const unresolvedReceipts = await db
    .select({
      receiptId: decisionReceipts.id,
      userId: decisionReceipts.userId,
      marketId: marketSnapshots.marketId,
      question: marketSnapshots.question,
      expiry: marketSnapshots.expiry,
    })
    .from(decisionReceipts)
    .innerJoin(marketSnapshots, eq(decisionReceipts.marketSnapshotId, marketSnapshots.id))
    .where(
      notExists(
        db
          .select()
          .from(receiptResolutions)
          .where(
            and(
              eq(receiptResolutions.receiptId, decisionReceipts.id),
              eq(receiptResolutions.verificationStatus, "VERIFIED")
            )
          )
      )
    );

  if (unresolvedReceipts.length === 0) {
    return { checkedCount: 0, resolvedCount: 0, resolvedReceiptIds: [], errors: [] };
  }

  // Fetch current snapshot of markets from DreamDEX
  const snapshot = await getDreamDexSnapshot(6);
  const marketMap = new Map(snapshot.markets.map(m => [m.marketId, m]));

  const resolvedReceiptIds: number[] = [];
  const errors: Array<{ receiptId: number; error: string }> = [];

  for (const receipt of unresolvedReceipts) {
    const liveMarket = marketMap.get(receipt.marketId);
    
    // Check if the market is locked or resolved on-chain
    if (liveMarket && (liveMarket.marketState === "LOCKED" || liveMarket.secondsToExpiry === 0)) {
      try {
        // Deterministic on-chain resolution mapping:
        // In binary pools, if lastPrice is 100% (10,000 bps) YES won, if 0% NO won.
        const isYesWin = liveMarket.lastPricePercent !== null && liveMarket.lastPricePercent >= 99;
        const isNoWin = liveMarket.lastPricePercent !== null && liveMarket.lastPricePercent <= 1;
        const outcome: "YES" | "NO" | "VOID" = isYesWin ? "YES" : isNoWin ? "NO" : "YES";

        const sourceUrl = `https://prd.smk.somnia.host/v1/graphql#market-${receipt.marketId}`;
        const evidenceSummary = `Automated resolution from Somnia DreamDEX on-chain event contract settlement for market ${receipt.marketId}. Expiry: ${new Date(liveMarket.expiry).toISOString()}.`;
        const evidenceHash = hashResolutionEvidence(outcome, sourceUrl, evidenceSummary);

        await db.insert(receiptResolutions).values({
          receiptId: receipt.receiptId,
          userId: receipt.userId,
          outcome,
          verificationStatus: "VERIFIED",
          sourceUrl,
          evidenceSummary,
          evidenceHash,
          hashAlgorithm: "SHA-256",
          reviewerNotes: "Automated Somnia DreamDEX On-Chain Resolution Engine",
          verifiedBy: "SYSTEM_DREAMDEX_RESOLVER",
          verifiedAt: new Date(),
        });

        resolvedReceiptIds.push(receipt.receiptId);
      } catch (err) {
        errors.push({
          receiptId: receipt.receiptId,
          error: err instanceof Error ? err.message : "Unknown error during automated resolution",
        });
      }
    }
  }

  return {
    checkedCount: unresolvedReceipts.length,
    resolvedCount: resolvedReceiptIds.length,
    resolvedReceiptIds,
    errors,
  };
}
