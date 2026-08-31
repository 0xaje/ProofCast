import {
  SOMNIA_MAINNET_ADDRESSES,
  SomniaMarkets,
  type BinaryMarket,
  type BinaryOrderBook,
} from "@somnia-chain/markets-sdk";
import { somniaMainnet } from "@somnia-chain/markets-sdk/chains";

const DREAMDEX_MAINNET_INDEXER = "https://prd.smk.somnia.host/v1/graphql";
const REQUEST_TIMEOUT_MS = 9_000;
const STALE_CACHE_MS = 120_000;
export const SNAPSHOT_CACHE_TTL_MS = 5_000;

export type DreamDexDataState = "LIVE" | "STALE" | "UNAVAILABLE";
export type DreamDexMarketState = "TRADING" | "PREOPEN" | "LOCKED";

export type DreamDexBookLevel = {
  pricePercent: number;
  quantity: string;
};

export type DreamDexMarketSnapshot = {
  marketId: string;
  marketAddress: string;
  poolAddress: string;
  asset: string;
  question: string;
  indexedStatus: string;
  marketState: DreamDexMarketState;
  tradingStart: number;
  expiry: number;
  secondsToExpiry: number;
  lastPricePercent: number | null;
  bestBidPercent: number | null;
  bestAskPercent: number | null;
  midPercent: number | null;
  spreadBps: number | null;
  yesBids: DreamDexBookLevel[];
  yesAsks: DreamDexBookLevel[];
};

export type DreamDexSnapshot = {
  state: DreamDexDataState;
  asOf: number | null;
  ageMs: number | null;
  network: "somnia-mainnet";
  chainId: number;
  provenance: {
    indexer: string;
    orderBook: "on-chain binary pool read";
    method: "official @somnia-chain/markets-sdk (read-only)";
  };
  markets: DreamDexMarketSnapshot[];
  message: string;
};

let lastSuccessfulSnapshot: DreamDexSnapshot | null = null;
let cachedLiveSnapshot: { snapshot: DreamDexSnapshot; expiresAt: number; limit: number } | null = null;
let inFlightSnapshotPromise: Promise<DreamDexSnapshot> | null = null;

export function clearDreamDexCacheForTesting(): void {
  lastSuccessfulSnapshot = null;
  cachedLiveSnapshot = null;
  inFlightSnapshotPromise = null;
}

function withTimeout<T>(work: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("DreamDEX request timed out")), timeoutMs);
    work.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function decimalScale(decimals: number): bigint {
  let value = BigInt(1);
  for (let index = 0; index < decimals; index += 1) value *= BigInt(10);
  return value;
}

function rawToDecimal(raw: bigint | string | null | undefined, decimals: number, precision = 6): number | null {
  if (raw === null || raw === undefined) return null;
  const rawValue = typeof raw === "bigint" ? raw : BigInt(raw);
  const scale = decimalScale(decimals);
  const displayScale = decimalScale(precision);
  return Number((rawValue * displayScale) / scale) / Number(displayScale);
}

export function formatRawUnits(raw: bigint, decimals: number, precision = 3): string {
  const scale = decimalScale(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;
  if (precision === 0 || fraction === BigInt(0)) return whole.toString();

  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, precision).replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

function probabilityPercent(raw: bigint | string | null | undefined, decimals: number): number | null {
  const probability = rawToDecimal(raw, decimals);
  if (probability === null) return null;
  return Math.max(0, Math.min(100, probability * 100));
}

export function marketStateAt(market: Pick<BinaryMarket, "tradingStart" | "expiry">, nowSeconds: number): DreamDexMarketState {
  const tradingStart = Number(market.tradingStart);
  const expiry = Number(market.expiry);
  if (nowSeconds < tradingStart) return "PREOPEN";
  if (nowSeconds >= expiry) return "LOCKED";
  return "TRADING";
}

function priceSpreadBps(bestBid: number | null, bestAsk: number | null): number | null {
  if (bestBid === null || bestAsk === null) return null;
  const mid = (bestBid + bestAsk) / 2;
  return mid > 0 ? Math.round(((bestAsk - bestBid) / mid) * 10_000) : null;
}

function mapBookLevels(levels: BinaryOrderBook["yesBids"], decimals: number): DreamDexBookLevel[] {
  return levels.slice(0, 3).map(level => ({
    pricePercent: probabilityPercent(level.price, decimals) ?? 0,
    quantity: formatRawUnits(level.quantity, decimals),
  }));
}

function mapMarket(market: BinaryMarket, book: BinaryOrderBook, nowSeconds: number): DreamDexMarketSnapshot {
  const bestBidPercent = probabilityPercent(book.yesBids[0]?.price, market.quoteDecimals);
  const bestAskPercent = probabilityPercent(book.yesAsks[0]?.price, market.quoteDecimals);
  const midPercent = bestBidPercent !== null && bestAskPercent !== null ? (bestBidPercent + bestAskPercent) / 2 : null;

  return {
    marketId: market.marketId,
    marketAddress: market.marketAddress,
    poolAddress: market.poolAddress,
    asset: market.asset,
    question: market.question,
    indexedStatus: market.status,
    marketState: marketStateAt(market, nowSeconds),
    tradingStart: Number(market.tradingStart) * 1_000,
    expiry: Number(market.expiry) * 1_000,
    secondsToExpiry: Math.max(0, Number(market.expiry) - nowSeconds),
    lastPricePercent: probabilityPercent(market.lastPrice, market.quoteDecimals),
    bestBidPercent,
    bestAskPercent,
    midPercent,
    spreadBps: priceSpreadBps(bestBidPercent, bestAskPercent),
    yesBids: mapBookLevels(book.yesBids, market.baseDecimals),
    yesAsks: mapBookLevels(book.yesAsks, market.baseDecimals),
  };
}

function unavailableSnapshot(message: string): DreamDexSnapshot {
  return {
    state: "UNAVAILABLE",
    asOf: null,
    ageMs: null,
    network: "somnia-mainnet",
    chainId: somniaMainnet.id,
    provenance: {
      indexer: DREAMDEX_MAINNET_INDEXER,
      orderBook: "on-chain binary pool read",
      method: "official @somnia-chain/markets-sdk (read-only)",
    },
    markets: [],
    message,
  };
}

/**
 * Returns bounded, read-only Event Contract snapshots. No account, signer, wallet,
 * approval, order, cancellation, mint, settlement, or redemption capability is created.
 */
function e2eFixtureSnapshot(): DreamDexSnapshot {
  const now = Date.now();
  return {
    state: "LIVE",
    asOf: now,
    ageMs: 0,
    network: "somnia-mainnet",
    chainId: somniaMainnet.id,
    provenance: {
      indexer: "test-only fixture; not a production source",
      orderBook: "on-chain binary pool read",
      method: "official @somnia-chain/markets-sdk (read-only)",
    },
    markets: [{
      marketId: "e2e-market-1",
      marketAddress: "0xe2e-market",
      poolAddress: "0xe2e-pool",
      asset: "BTC",
      question: "E2E test market resolves after the receipt is committed",
      indexedStatus: "Trading",
      marketState: "TRADING",
      tradingStart: now - 60_000,
      expiry: now + 600_000,
      secondsToExpiry: 600,
      lastPricePercent: 61.25,
      bestBidPercent: 60.5,
      bestAskPercent: 62,
      midPercent: 61.25,
      spreadBps: 246,
      yesBids: [{ pricePercent: 60.5, quantity: "12.5" }],
      yesAsks: [{ pricePercent: 62, quantity: "8" }],
    }],
    message: "Test-only fixture snapshot; never used as live product data.",
  };
}

export async function getDreamDexSnapshot(limit = 3): Promise<DreamDexSnapshot> {
  const now = Date.now();
  // Return cached live snapshot if still valid and covers requested limit
  if (
    cachedLiveSnapshot &&
    cachedLiveSnapshot.snapshot.state === "LIVE" &&
    cachedLiveSnapshot.limit >= limit &&
    now < cachedLiveSnapshot.expiresAt
  ) {
    const ageMs = now - (cachedLiveSnapshot.snapshot.asOf ?? now);
    return {
      ...cachedLiveSnapshot.snapshot,
      ageMs,
      markets: cachedLiveSnapshot.snapshot.markets.slice(0, limit),
    };
  }

  if (process.env.NODE_ENV !== "production" && process.env.PROOFCAST_E2E === "1" && process.env.PROOFCAST_E2E_FIXTURE === "1") {
    const fixture = e2eFixtureSnapshot();
    cachedLiveSnapshot = {
      snapshot: fixture,
      expiresAt: now + SNAPSHOT_CACHE_TTL_MS,
      limit: Math.max(limit, 6),
    };
    return fixture;
  }

  // Coalesce concurrent requests into the same in-flight execution
  if (inFlightSnapshotPromise) {
    const coalesced = await inFlightSnapshotPromise;
    return {
      ...coalesced,
      markets: coalesced.markets.slice(0, limit),
    };
  }

  const executeFetch = async (): Promise<DreamDexSnapshot> => {
    const exchange = new SomniaMarkets({
      chain: somniaMainnet,
      wsRpcUrl: "wss://api.infra.mainnet.somnia.network/ws",
      indexerUrl: DREAMDEX_MAINNET_INDEXER,
      addresses: SOMNIA_MAINNET_ADDRESSES,
    });

    try {
      const nowSeconds = Math.floor(Date.now() / 1_000);
      const fetchLimit = Math.max(limit, 6); // Fetch up to 6 to populate warm cache for other endpoints
      const liveMarkets = await withTimeout(exchange.client.listLiveBinaryMarkets());
      const selectedMarkets = liveMarkets.slice(0, fetchLimit);
      const books = await withTimeout(
        Promise.all(
          selectedMarkets.map(market =>
            exchange.client.getBinaryOrderBook(market.poolAddress, {
              depth: 3,
              decimals: market.quoteDecimals,
            }),
          ),
        ),
      );
      const asOf = Date.now();
      const snapshot: DreamDexSnapshot = {
        state: "LIVE",
        asOf,
        ageMs: 0,
        network: "somnia-mainnet",
        chainId: somniaMainnet.id,
        provenance: {
          indexer: DREAMDEX_MAINNET_INDEXER,
          orderBook: "on-chain binary pool read",
          method: "official @somnia-chain/markets-sdk (read-only)",
        },
        markets: selectedMarkets.map((market, index) => mapMarket(market, books[index]!, nowSeconds)),
        message: "Verified Event Contract snapshot retrieved from the official DreamDEX SDK.",
      };
      lastSuccessfulSnapshot = snapshot;
      cachedLiveSnapshot = {
        snapshot,
        expiresAt: asOf + SNAPSHOT_CACHE_TTL_MS,
        limit: fetchLimit,
      };
      return snapshot;
    } catch (error) {
      const errorNow = Date.now();
      if (lastSuccessfulSnapshot?.asOf && errorNow - lastSuccessfulSnapshot.asOf <= STALE_CACHE_MS) {
        return {
          ...lastSuccessfulSnapshot,
          state: "STALE",
          ageMs: errorNow - lastSuccessfulSnapshot.asOf,
          message: "The most recent verified DreamDEX snapshot is temporarily stale; no newer values are shown as live.",
        };
      }

      console.warn("[DreamDEX] Live Event Contract snapshot unavailable", error instanceof Error ? error.message : error);
      return unavailableSnapshot("DreamDEX did not return a verified Event Contract snapshot. The interface is withholding market values rather than substituting a demo.");
    } finally {
      await exchange.close().catch(() => undefined);
      inFlightSnapshotPromise = null;
    }
  };

  inFlightSnapshotPromise = executeFetch();
  const result = await inFlightSnapshotPromise;
  return {
    ...result,
    markets: result.markets.slice(0, limit),
  };
}
