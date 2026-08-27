# DreamDEX Event Contracts — Integration Capability Report

**Date:** 27 August 2026  
**Scope:** Verified official Somnia DreamDEX Event Contracts SDK (`@somnia-chain/markets-sdk` v0.28.0), network interfaces, on-chain settlement, execution signatures, and data contracts.

---

## 1. Executive Summary

This report validates the exact capabilities of the official Somnia Markets SDK (`@somnia-chain/markets-sdk` v0.28.0) and on-chain Event Contract interfaces for ProofCast. 

ProofCast integrates with Somnia DreamDEX binary event markets to provide an immutable decision-and-proof loop:
$$\text{Observe (Market \& Book)} \longrightarrow \text{Understand (EventForge AI)} \longrightarrow \text{Commit (Receipt)} \longrightarrow \text{Resolve (On-Chain Listener)} \longrightarrow \text{Prove (Brier Score \& Calibration)}$$

---

## 2. Verified Capabilities Matrix

| Domain | Official SDK Method / Interface | Verified Status | Integration Details |
|---|---|:---:|---|
| **Market Discovery** | `markets.listBinaryMarkets()` | **VERIFIED** | Queries GraphQL indexer (`https://prd.smk.somnia.host/v1/graphql`) for active & historical binary markets. |
| **On-Chain Market Read** | `markets.getMarketOnchain(poolAddress)` | **VERIFIED** | Reads `IBinaryPool` state directly via Somnia RPC without relying on indexer latency. |
| **Order Book Depth** | `binary.getOrderBook(poolAddress)` | **VERIFIED** | Retrieves full `yesBids` and `yesAsks` arrays with raw quantities and price levels. |
| **Pricing & Tick Size** | `markYesPrice()`, `bookMidPrice()` | **VERIFIED** | Tick size is $0.01\text{ USD}$ ($100\text{ bps}$), quote scaled by `quoteDecimals`, base scaled by `baseDecimals`. |
| **Lifecycle & Status** | `market.status`, `marketStateAt()` | **VERIFIED** | `0: Listed`, `1: Trading`, `2: Locked`, `3: Settling`, `4: Resolved`, `5: Voided`. |
| **Resolution Outcome** | `market.winningOutcome`, `resolvedAtTimestamp` | **VERIFIED** | `0 = YES`, `1 = NO`, `voided = true` (or uniform vector). Emits `Resolved(winner, payoutNumerators)`. |
| **Order Construction** | `trader.buildPlaceOrder(params)` | **VERIFIED** | Returns unsigned calls (`order` + `approval`) for client-side wallet signing (zero server custody). |
| **Order Execution** | `trader.placeOrder(params)` | **VERIFIED** | Supports `BUY_YES`, `SELL_YES`, `BUY_NO`, `SELL_NO`, limit/market orders (`ORDER_TYPE.IOC`, `ORDER_TYPE.NORMAL`). |
| **Position Tracking** | `trader.getPositions()`, `markOutcomePosition()` | **VERIFIED** | Returns ERC-6909 outcome token balances for `yesTokenId` and `noTokenId`. |
| **Settlement & Claim** | `claimableFrom()`, `trader.redeemMany()` | **VERIFIED** | Winner redeems at $(1 - \text{fee})$, voided redeems at $50\%$, loser redeems at $0$. |

---

## 3. Detailed Technical Architecture

### 3.1 Market Discovery & Order Book Ingestion
- **Protocol Contract**: `BinaryPool` (cloned per market from `BinaryMarketsModule`).
- **Token Model**: Single multi-token contract (ERC-6909) where each market has unique `yesTokenId` and `noTokenId`.
- **Collateral**: ERC-20 stablecoin (e.g. USDT/USDC) or native STT.
- **Order Book Structure**: CLOB (Central Limit Order Book) maintained on-chain via binary pools.

```typescript
// Reading live order book from on-chain pool
const book = await markets.binary.getOrderBook(poolAddress);
const bestBid = book.yesBids[0]?.price; // Scaled by quoteDecimals
const bestAsk = book.yesAsks[0]?.price; // Scaled by quoteDecimals
const midPrice = (bestBid + bestAsk) / 2n;
```

### 3.2 Automated Resolution & Outcome Detection
DreamDEX event contracts resolve through Oracle v2 payout vectors. The SDK exposes canonical resolved properties:
- `winningOutcome`: `0` (YES) or `1` (NO).
- `voided`: `true` if market was cancelled/voided.
- `resolvedAtBlock` and `resolvedAtTimestamp`: Exact on-chain timestamp of oracle settlement.
- `payoutNumerators`: Array of payout weights scaled to `payoutDenominator` ($10,000,000$).

```typescript
// Resolution verification pattern for ProofCast listener
if (market.status === "Resolved" || market.status === "Voided") {
  const outcome: "YES" | "NO" | "VOID" = market.voided 
    ? "VOID" 
    : market.winningOutcome === 0 
      ? "YES" 
      : "NO";
  
  await resolveDecisionReceipt({
    receiptId,
    outcome,
    resolvedAtTimestamp: Number(market.resolvedAtTimestamp),
    resolvedAtBlock: market.resolvedAtBlock,
    source: "SOMNIA_DREAMDEX_ONCHAIN"
  });
}
```

### 3.3 Zero-Custody Order Execution Flow
To maintain strict security and avoid holding user private keys:
1. User configures order on the **Market Decision** interface.
2. Client queries `trader.buildPlaceOrder({ pool, side, price, quantity })`.
3. Client browser wallet (e.g., MetaMask via Viem) signs the transaction.
4. Transaction is broadcast to Somnia Shannon Testnet / Mainnet.
5. On-chain `OrderPlaced` or `OrderFilled` event returns the `orderId` and `fills` to be recorded on the Decision Receipt.

---

## 4. Safety & Boundary Guarantees

1. **No Private Key Ingestion**: Neither the backend server nor any AI agent will ever receive, parse, or store wallet private keys.
2. **Deterministic Pre-flight Verification**: Before any transaction is requested, the client verifies market status (`Trading`), expiry (`now < expiry`), tick precision ($100\text{ bps}$), and minimum lot size.
3. **No Synthetic Liquidity**: ProofCast never fabricates quotes or volume. Missing liquidity displays plainly as empty book levels.
