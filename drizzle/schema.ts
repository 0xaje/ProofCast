import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Server-captured DreamDEX context retained as immutable evidence for a receipt. */
export const marketSnapshots = mysqlTable(
  "market_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    marketId: varchar("marketId", { length: 128 }).notNull(),
    marketAddress: varchar("marketAddress", { length: 64 }).notNull(),
    poolAddress: varchar("poolAddress", { length: 64 }).notNull(),
    asset: varchar("asset", { length: 32 }).notNull(),
    question: text("question").notNull(),
    indexedStatus: varchar("indexedStatus", { length: 32 }).notNull(),
    marketState: mysqlEnum("marketState", ["TRADING", "PREOPEN", "LOCKED"]).notNull(),
    network: varchar("network", { length: 64 }).notNull(),
    chainId: int("chainId").notNull(),
    sourceAsOf: bigint("sourceAsOf", { mode: "number" }).notNull(),
    capturedAt: timestamp("capturedAt").defaultNow().notNull(),
    tradingStart: bigint("tradingStart", { mode: "number" }).notNull(),
    expiry: bigint("expiry", { mode: "number" }).notNull(),
    secondsToExpiry: int("secondsToExpiry").notNull(),
    lastPriceBps: int("lastPriceBps"),
    bestBidBps: int("bestBidBps"),
    bestAskBps: int("bestAskBps"),
    midBps: int("midBps"),
    spreadBps: int("spreadBps"),
    provenanceJson: text("provenanceJson").notNull(),
    orderBookJson: text("orderBookJson").notNull(),
  },
  table => ({
    marketCapturedIdx: index("market_snapshots_market_captured_idx").on(table.marketId, table.capturedAt),
    sourceAsOfIdx: index("market_snapshots_source_as_of_idx").on(table.sourceAsOf),
  }),
);

/** A user’s immutable committed forecast. Corrections must be represented by a future revision record. */
export const forecasts = mysqlTable(
  "forecasts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    marketId: varchar("marketId", { length: 128 }).notNull(),
    direction: mysqlEnum("direction", ["UP", "DOWN"]).notNull(),
    probabilityBps: int("probabilityBps").notNull(),
    confidence: mysqlEnum("confidence", ["LOW", "MEDIUM", "HIGH"]).notNull(),
    thesis: text("thesis").notNull(),
    counterThesis: text("counterThesis").notNull(),
    status: mysqlEnum("status", ["COMMITTED", "REVISED"]).default("COMMITTED").notNull(),
    committedAt: timestamp("committedAt").defaultNow().notNull(),
  },
  table => ({
    userCreatedIdx: index("forecasts_user_created_idx").on(table.userId, table.committedAt),
    marketCreatedIdx: index("forecasts_market_created_idx").on(table.marketId, table.committedAt),
  }),
);

/** Binds one committed forecast to the exact market evidence captured by the server. */
export const decisionReceipts = mysqlTable(
  "decision_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    forecastId: int("forecastId").notNull().references(() => forecasts.id),
    marketSnapshotId: int("marketSnapshotId").notNull().references(() => marketSnapshots.id),
    version: int("version").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    forecastUniqueIdx: uniqueIndex("decision_receipts_forecast_unique").on(table.forecastId),
    userCreatedIdx: index("decision_receipts_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MarketSnapshot = typeof marketSnapshots.$inferSelect;
export type InsertMarketSnapshot = typeof marketSnapshots.$inferInsert;
export type Forecast = typeof forecasts.$inferSelect;
export type InsertForecast = typeof forecasts.$inferInsert;
export type DecisionReceipt = typeof decisionReceipts.$inferSelect;
export type InsertDecisionReceipt = typeof decisionReceipts.$inferInsert;
