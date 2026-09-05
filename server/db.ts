import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _schemaSynced = false;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      if (!_schemaSynced) {
        _schemaSynced = true;
        ensureDatabaseSchema().catch(err => {
          console.warn("[Database] Schema sync error:", err instanceof Error ? err.message : err);
        });
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Self-healing schema migration that ensures all required tables and columns exist.
 * This runs safely on Render, VPS, or remote MySQL/TiDB databases without needing
 * manual migration commands or external database tooling.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const db = _db || drizzle(process.env.DATABASE_URL);

  try {
    console.log("[Database] Checking and synchronizing schema on remote database...");

    // 1. Ensure core tables exist
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`openId\` varchar(64) NOT NULL UNIQUE,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`market_snapshots\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`marketId\` varchar(128) NOT NULL,
        \`marketAddress\` varchar(64) NOT NULL,
        \`poolAddress\` varchar(64) NOT NULL,
        \`asset\` varchar(32) NOT NULL,
        \`question\` text NOT NULL,
        \`indexedStatus\` varchar(32) NOT NULL,
        \`marketState\` enum('TRADING','PREOPEN','LOCKED') NOT NULL,
        \`network\` varchar(64) NOT NULL,
        \`chainId\` int NOT NULL,
        \`sourceAsOf\` bigint NOT NULL,
        \`capturedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`tradingStart\` bigint NOT NULL,
        \`expiry\` bigint NOT NULL,
        \`secondsToExpiry\` int NOT NULL,
        \`lastPriceBps\` int,
        \`bestBidBps\` int,
        \`bestAskBps\` int,
        \`midBps\` int,
        \`spreadBps\` int,
        \`provenanceJson\` text NOT NULL,
        \`orderBookJson\` text NOT NULL
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`forecasts\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`userId\` int NOT NULL,
        \`marketId\` varchar(128) NOT NULL,
        \`direction\` enum('UP','DOWN') NOT NULL,
        \`probabilityBps\` int NOT NULL,
        \`confidence\` enum('LOW','MEDIUM','HIGH') NOT NULL,
        \`thesis\` text NOT NULL,
        \`counterThesis\` text NOT NULL,
        \`status\` enum('COMMITTED','REVISED') NOT NULL DEFAULT 'COMMITTED',
        \`committedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`decision_receipts\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`userId\` int NOT NULL,
        \`forecastId\` int NOT NULL,
        \`marketSnapshotId\` int NOT NULL,
        \`version\` int NOT NULL DEFAULT 1,
        \`commitmentHash\` varchar(66),
        \`modelProbabilityBps\` int,
        \`modelConfidence\` varchar(32),
        \`marketQuality\` varchar(32),
        \`executablePriceBps\` int,
        \`executableEdgeBps\` int,
        \`anchorTxHash\` varchar(128),
        \`anchorAddress\` varchar(64),
        \`anchorTimestamp\` timestamp NULL,
        \`tradeTxHash\` varchar(128),
        \`tradeOrderId\` varchar(64),
        \`tradeStatus\` varchar(32) DEFAULT 'NONE',
        \`signerAddress\` varchar(64),
        \`eip712Signature\` text,
        \`stakeAmountWei\` varchar(64),
        \`stakeTxHash\` varchar(128),
        \`stakeStatus\` enum('NONE','STAKED','WON','LOST','REFUNDED') NOT NULL DEFAULT 'NONE',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`forecast_revisions\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`receiptId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`parentForecastId\` int NOT NULL,
        \`revisionNumber\` int NOT NULL,
        \`direction\` enum('UP','DOWN') NOT NULL,
        \`probabilityBps\` int NOT NULL,
        \`confidence\` enum('LOW','MEDIUM','HIGH') NOT NULL,
        \`thesis\` text NOT NULL,
        \`counterThesis\` text NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS \`receipt_resolutions\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`receiptId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`outcome\` enum('YES','NO','VOID') NOT NULL,
        \`verificationStatus\` enum('SUBMITTED','VERIFIED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
        \`sourceUrl\` varchar(2048) NOT NULL,
        \`evidenceSummary\` text NOT NULL,
        \`evidenceHash\` varchar(128) NOT NULL DEFAULT '',
        \`hashAlgorithm\` varchar(32) NOT NULL DEFAULT 'SHA-256',
        \`oracleSource\` varchar(64) NOT NULL DEFAULT 'DREAMDEX_ONCHAIN',
        \`reviewerNotes\` text,
        \`verifiedBy\` varchar(128),
        \`verifiedAt\` timestamp NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 2. Safely add missing columns to decision_receipts if the table was created on an older schema
    try {
      const colRows = await db.execute(sql.raw(`SHOW COLUMNS FROM \`decision_receipts\``)) as unknown;
      const rawArray = Array.isArray(colRows) && Array.isArray(colRows[0]) ? colRows[0] : Array.isArray(colRows) ? colRows : [];
      const existingCols = new Set(rawArray.map((row: any) => String(row.Field || row.field || "").toLowerCase()));

      const columnsToAdd: [string, string][] = [
        ["commitmenthash", "ADD COLUMN `commitmentHash` varchar(66)"],
        ["modelprobabilitybps", "ADD COLUMN `modelProbabilityBps` int"],
        ["modelconfidence", "ADD COLUMN `modelConfidence` varchar(32)"],
        ["marketquality", "ADD COLUMN `marketQuality` varchar(32)"],
        ["executablepricebps", "ADD COLUMN `executablePriceBps` int"],
        ["executableedgebps", "ADD COLUMN `executableEdgeBps` int"],
        ["anchortxhash", "ADD COLUMN `anchorTxHash` varchar(128)"],
        ["anchoraddress", "ADD COLUMN `anchorAddress` varchar(64)"],
        ["anchortimestamp", "ADD COLUMN `anchorTimestamp` timestamp NULL"],
        ["tradetxhash", "ADD COLUMN `tradeTxHash` varchar(128)"],
        ["tradeorderid", "ADD COLUMN `tradeOrderId` varchar(64)"],
        ["tradestatus", "ADD COLUMN `tradeStatus` varchar(32) DEFAULT 'NONE'"],
        ["signeraddress", "ADD COLUMN `signerAddress` varchar(64)"],
        ["eip712signature", "ADD COLUMN `eip712Signature` text"],
        ["stakeamountwei", "ADD COLUMN `stakeAmountWei` varchar(64)"],
        ["staketxhash", "ADD COLUMN `stakeTxHash` varchar(128)"],
        ["stakestatus", "ADD COLUMN `stakeStatus` enum('NONE','STAKED','WON','LOST','REFUNDED') NOT NULL DEFAULT 'NONE'"],
      ];

      for (const [colName, addClause] of columnsToAdd) {
        if (!existingCols.has(colName)) {
          console.log(`[Database] Adding missing column to decision_receipts: ${colName}`);
          try {
            await db.execute(sql.raw(`ALTER TABLE \`decision_receipts\` ${addClause}`));
          } catch (colErr) {
            console.warn(`[Database] Could not add column ${colName}:`, colErr);
          }
        }
      }
    } catch (checkErr) {
      console.warn("[Database] Could not inspect decision_receipts columns:", checkErr);
    }

    // 3. Safely add missing columns to receipt_resolutions if needed
    try {
      const resColRows = await db.execute(sql.raw(`SHOW COLUMNS FROM \`receipt_resolutions\``)) as unknown;
      const resRawArray = Array.isArray(resColRows) && Array.isArray(resColRows[0]) ? resColRows[0] : Array.isArray(resColRows) ? resColRows : [];
      const resExistingCols = new Set(resRawArray.map((row: any) => String(row.Field || row.field || "").toLowerCase()));

      if (!resExistingCols.has("oraclesource")) {
        console.log("[Database] Adding missing oracleSource column to receipt_resolutions");
        await db.execute(sql.raw("ALTER TABLE `receipt_resolutions` ADD COLUMN `oracleSource` varchar(64) NOT NULL DEFAULT 'DREAMDEX_ONCHAIN'"));
      }
      if (!resExistingCols.has("evidencehash")) {
        console.log("[Database] Adding missing evidenceHash column to receipt_resolutions");
        await db.execute(sql.raw("ALTER TABLE `receipt_resolutions` ADD COLUMN `evidenceHash` varchar(128) NOT NULL DEFAULT ''"));
      }
      if (!resExistingCols.has("hashalgorithm")) {
        console.log("[Database] Adding missing hashAlgorithm column to receipt_resolutions");
        await db.execute(sql.raw("ALTER TABLE `receipt_resolutions` ADD COLUMN `hashAlgorithm` varchar(32) NOT NULL DEFAULT 'SHA-256'"));
      }
      if (!resExistingCols.has("reviewernotes")) {
        console.log("[Database] Adding missing reviewerNotes column to receipt_resolutions");
        await db.execute(sql.raw("ALTER TABLE `receipt_resolutions` ADD COLUMN `reviewerNotes` text"));
      }
    } catch (resErr) {
      console.warn("[Database] Could not inspect receipt_resolutions columns:", resErr);
    }

    console.log("[Database] Schema synchronization complete.");
  } catch (err) {
    console.warn("[Database] Schema check failed:", err instanceof Error ? err.message : err);
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

