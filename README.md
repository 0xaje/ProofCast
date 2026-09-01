<div align="center">

# ↗ proofcast
### *Predictions are cheap. Proof is not.*

**The forecasting intelligence & cryptographic accountability layer built natively for Somnia DreamDEX Event Contracts.**

[![Live App](https://img.shields.io/badge/Live_App-proofcast.onrender.com-c8f06a?style=for-the-badge&logo=render&logoColor=080b10)](https://proofcast.onrender.com)
[![Somnia Network](https://img.shields.io/badge/Network-Somnia_Shannon_Testnet-c8f06a?style=for-the-badge&logo=ethereum&logoColor=080b10)](https://shannon-explorer.somnia.network)
[![Smart Contract](https://img.shields.io/badge/Solidity-0.8.20_Verified-f04b2f?style=for-the-badge&logo=solidity&logoColor=white)](contracts/ProofCastAnchor.sol)
[![DreamDEX](https://img.shields.io/badge/DEX-DreamDEX_Event_Contracts-38bdf8?style=for-the-badge&logo=polkadot&logoColor=white)](https://docs.dreamdex.io)
[![EIP-712](https://img.shields.io/badge/Cryptography-EIP--712_%2B_SHA--256-blue?style=for-the-badge&logo=letsencrypt&logoColor=white)](shared/eip712.ts)
[![Tests](https://img.shields.io/badge/Tests-42%2F42_Passed-emerald?style=for-the-badge&logo=vitest&logoColor=white)](server/receipts.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_0_Errors-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](tsconfig.json)
[![License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)

<br/>

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  01. OBSERVE │ ──> │02. UNDERSTAND│ ──> │  03. COMMIT  │ ──> │  04. ANCHOR  │ ──> │  05. PROVE   │
  │   DreamDEX   │     │  EventForge  │     │   EIP-712    │     │Somnia Anchor │     │ Brier Scores │
  └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

</div>

---

## 1. Executive Summary

Prediction markets reflect what the crowd prices. However, crowd consensus is frequently warped by speculative hype, social media echo chambers, and hindsight bias. Traders delete losing forecasts, models claim high accuracy without verifiable records, and market participants fail to preserve *why* they held a belief before an outcome was decided.

**ProofCast** is the **native decision intelligence and cryptographic verification layer for Somnia DreamDEX Event Contracts**.

### Core Architecture Highlights
1. **Live DreamDEX Ingestion**: Direct integration with Somnia binary event pools and order-book depth via `@somnia-chain/markets-sdk`.
2. **EventForge Dual-Layer AI**: Deterministic order-book microstructure calculations coupled with real-time multi-model AI reasoning (Claude, Gemini, DeepSeek, Meta-Ensemble).
3. **EIP-712 Decision Receipts**: Forecasters freeze their probability, confidence, thesis, and counter-thesis into a signed SHA-256 cryptographic digest before outcome settlement.
4. **Somnia Smart Contract Anchoring & Staking**: Immutable on-chain anchoring via `ProofCastAnchor.sol` on Somnia Shannon Testnet, with optional native `$SOM` conviction staking.
5. **Automated On-Chain Resolution & Brier Calibration**: Background daemons monitor on-chain settlements, auto-resolve receipts, and calculate empirical Brier calibration scores ($BS \in [0, 1]$), registering verified **Soulbound Reputation Badges** on-chain.

---

## 2. The 7-Step Verified Lifecycle

ProofCast converts market noise into immutable decision intelligence across 7 deterministic phases:

$$\mathbf{OBSERVE} \longrightarrow \mathbf{UNDERSTAND} \longrightarrow \mathbf{CHALLENGE} \longrightarrow \mathbf{COMMIT} \longrightarrow \mathbf{ANCHOR} \longrightarrow \mathbf{RESOLVE} \longrightarrow \mathbf{PROVE}$$

```mermaid
flowchart LR
  subgraph Phase1 [1. Intelligence]
    A[01. Observe: DreamDEX Signals] --> B[02. Understand: EventForge AI]
    B --> C[03. Challenge: Counter-Thesis]
  end

  subgraph Phase2 [2. Commitment]
    C --> D[04. Commit: EIP-712 Receipt]
    D --> E[05. Anchor: Somnia Smart Contract]
  end

  subgraph Phase3 [3. Accountability]
    E --> F[06. Resolve: Automated Settlement]
    F --> G[07. Prove: Brier Calibration]
  end

  style Phase1 fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#fff
  style Phase2 fill:#0f172a,stroke:#c8f06a,stroke-width:1px,color:#fff
  style Phase3 fill:#0f172a,stroke:#a855f7,stroke-width:1px,color:#fff
```

| Step | Phase | Description | Implementation Mechanism |
| :--- | :--- | :--- | :--- |
| **01. OBSERVE** | Market Discovery | Live ingestion of Somnia DreamDEX binary event markets, order books, and depth levels. | `@somnia-chain/markets-sdk` |
| **02. UNDERSTAND** | Multi-Model AI | Deterministic microstructure fair value + LLM Bull/Bear reasoning. | EventForge Multi-Model Engine |
| **03. CHALLENGE** | Stress-Test Edge | Force forecasters to articulate counter-theses and calculate net executable edge. | True Executable Edge Algorithm |
| **04. COMMIT** | Sign Receipt | User cryptographically signs forecast probability, thesis, and evidence before settlement. | EIP-712 Typed Data + SHA-256 Digest |
| **05. ANCHOR** | Somnia On-Chain | Anchor hash on Somnia Shannon Testnet; optional payable native `$SOM` staking. | `ProofCastAnchor.sol` Smart Contract |
| **06. RESOLVE** | Auto-Settlement | Background daemon detects DreamDEX contract settlement & oracle webhooks. | `resolutionWorker.ts` / Oracle Webhook |
| **07. PROVE** | Reputation & Calibration | Mathematical Brier calibration, lead-time bonuses, and on-chain Soulbound Badges. | Brier Scoring Engine + SBT Badges |

---

## 3. Somnia & DreamDEX Integration

ProofCast is engineered natively around the technical architecture of the **Somnia High-Performance L1 Blockchain** (`Chain ID: 50312`) and the **DreamDEX Prediction Market Protocol**:

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              SOMNIA BLOCKCHAIN ECOSYSTEM                               │
 ├──────────────────────────────────────────┬─────────────────────────────────────────────┤
 │          DreamDEX Protocol               │             ProofCast Protocol              │
 │  • High-Throughput Binary Event Markets  │  • Multi-Model AI Decision Engine           │
 │  • On-Chain CLOB Order Book Depth        │  • Cryptographic EIP-712 Decision Receipts  │
 │  • ERC-6909 Multi-Token Outcome Shares   │  • Immutable Somnia Smart Contract Anchor   │
 │  • Automated Contract Payout Vectors     │  • Native $SOM Staking & Conviction Pool    │
 │  • Official @somnia-chain/markets-sdk    │  • Soulbound On-Chain Reputation Badges     │
 └──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

* **Sub-Second Finality & Low Gas**: Enables high-frequency receipt anchoring and automated resolution without prohibitive overhead.
* **On-Chain Microstructure**: Real order-book bid/ask levels from DreamDEX feed directly into EventForge's deterministic fair-value engine.
* **Zero Private Key Custody**: ProofCast never takes custody of private keys; all transactions and typed commitments are signed in the user's browser wallet.

---

## 4. System Capabilities

### 4.1 Live DreamDEX Discovery & Telemetry
* Direct querying via `@somnia-chain/markets-sdk` reading Somnia DreamDEX binary event pools.
* Microstructure telemetry: real-time bid/ask spreads, midpoints, book depth, and expiry countdowns.
* Explicit telemetry states (`LIVE`, `STALE`, `UNAVAILABLE`, `ERROR`) backed by an in-memory 5-second TTL cache.

### 4.2 EventForge Dual-Layer AI & SSE Streaming
* **Layer A (Deterministic Microstructure Engine)**: Pure mathematical model computing fair value from order-book depth imbalance, spread penalty, and time decay. Output is 100% deterministic: identical market inputs yield identical probability outputs.
* **Layer B (Multi-Model AI Reasoning)**: Real-time structured reasoning generating Bull Case, Bear Case, Key Risks, and Disagreement Analysis across Claude, Gemini, DeepSeek, and Meta-Ensemble.
* **Server-Sent Events (SSE)**: Mounted at `GET /api/eventforge/stream` for live token streaming.
* **Strict Invariant**: AI models cannot alter numerical probabilities, fabricate order books, or mutate market prices.

### 4.3 Triangulated Comparison & True Executable Edge
* **Triangulated Comparison**: Real-time comparison between **Market Price**, **EventForge Fair Value**, and **User Forecast**.
* **Market Quality Classification**: Categorizes market conditions into `TRADEABLE`, `WATCH`, or `NO_TRADE`.
* **True Executable Edge**: Calculates net edge after accounting for spread crossing and execution friction.

### 4.4 Cryptographic EIP-712 Receipts & Evidence Hashing
* **EIP-712 Typed Signing**: Standardized typed data verification (`domain: { name: "ProofCast", chainId: 50312 }`, primary type: `ForecastCommitment`) verified via `viem`.
* **SHA-256 Digest**: Freezes market snapshot, probability, direction, thesis, counter-thesis, and timestamp into an immutable 32-byte hash.
* **Parent-Linked Revisions**: Historical forecasts are never overwritten; updates create parent-linked `forecast_revisions`.

### 4.5 Somnia Smart Contract (`ProofCastAnchor.sol`) & Staking
* **Non-Custodial Anchoring**: Stores `(receiptHash, marketId, timestamp, owner, stakeAmount)`.
* **Payable $SOM Staking**: `anchorReceiptWithStake()` allows forecasters to stake native Somnia tokens behind high-conviction predictions.
* **Soulbound Forecaster Badges**: Registers verified reputation tiers (`GOLD_MASTER`, `SILVER`, `BRONZE`, `UNRANKED`) directly on-chain.

### 4.6 Automated Resolution Worker & Oracle Webhooks
* **Automated Daemon Worker**: `server/resolutionWorker.ts` polls on-chain DreamDEX settlement status every 60 seconds without manual bottlenecks.
* **Oracle Webhook**: `POST /api/oracle/resolve` enables sub-second settlement for UMA / Chainlink oracles with `ORACLE_WEBHOOK_SECRET` protection.
* **Automated Stake Resolution**: Automatically transitions stakes to `WON`, `LOST`, or `REFUNDED`.

### 4.7 Brier Calibration & Soulbound Reputation Tiers
* **Strict Brier Scoring**: Dimensionless $BS = (f - o)^2 \in [0, 1]$, where $0.000$ represents perfection.
* **Lead-Time Logarithmic Weighting**: Skill bonus for early commitments ($w = 1 + \ln(1 + \Delta t / 86400)$).
* **5-Bin Empirical Calibration**: Evaluates reliability across $[0-20\%]$, $[20-40\%]$, $[40-60\%]$, $[60-80\%]$, $[80-100\%]$.
* **Reputation Tier Matrix**:
  | Tier | Title | Minimum Requirements |
  | :--- | :--- | :--- |
  | **Gold Master** | `Gold Master Oracle` | $\ge 30$ verified receipts, $BS \le 0.12$, Accuracy $\ge 70\%$ |
  | **Silver** | `Silver Superforecaster` | $\ge 15$ verified receipts, $BS \le 0.18$, Accuracy $\ge 60\%$ |
  | **Bronze** | `Bronze Forecaster` | $\ge 5$ verified receipts, $BS \le 0.25$, Accuracy $\ge 50\%$ |
  | **Unranked** | `Unranked Apprentice` | $< 5$ verified receipts |

---

## 5. System Architecture

```mermaid
graph TD
  subgraph Client [Client Layer: React 19 / Vite]
    Landing[Landing Page & Live Telemetry]
    Signal[Signal Room & Market Discovery]
    Decision[Market Decision Workspace]
    Profile[Proof Profile & Receipt Archive]
    Leaderboard[Leaderboard & SBT Badges]
  end

  subgraph Server [Server Layer: Express / tRPC / Node 22]
    TRPC[tRPC API Router]
    DreamDEXService[DreamDEX Snapshot Service]
    EventForgeEngine[EventForge Multi-Model AI]
    SSEHandler[SSE Token Stream /api/eventforge/stream]
    WorkerDaemon[Automated Resolution Worker]
    OracleWebhook[Oracle Webhook /api/oracle/resolve]
    ScoringEngine[Brier Scoring & Calibration Engine]
  end

  subgraph Somnia [Somnia Shannon Testnet: Chain 50312]
    DreamDEXContracts[DreamDEX Binary Event Contracts]
    AnchorContract[ProofCastAnchor.sol Smart Contract]
  end

  subgraph Database [Database: Drizzle ORM / MySQL]
    DBSnapshots[(market_snapshots)]
    DBForecasts[(forecasts)]
    DBReceipts[(decision_receipts)]
    DBRevisions[(forecast_revisions)]
    DBResolutions[(receipt_resolutions)]
  end

  Signal --> TRPC
  Decision --> TRPC
  Decision --> SSEHandler
  Profile --> TRPC
  Leaderboard --> TRPC
  TRPC --> DreamDEXService
  TRPC --> EventForgeEngine
  TRPC --> ScoringEngine
  TRPC --> DBSnapshots
  TRPC --> DBForecasts
  TRPC --> DBReceipts

  DreamDEXService --> DreamDEXContracts
  WorkerDaemon --> DreamDEXContracts
  WorkerDaemon --> DBResolutions
  OracleWebhook --> DBResolutions

  Decision -. User Staking .-> AnchorContract
  Profile -. Verify Anchor .-> AnchorContract
```

---

## 6. Somnia Shannon Smart Contract Specification

* **Contract File**: [`contracts/ProofCastAnchor.sol`](contracts/ProofCastAnchor.sol)
* **Deployed Address**: [`0xe7da3a86ab86c3b5a09c992367083f1cec62d18e`](https://shannon-explorer.somnia.network/address/0xe7da3a86ab86c3b5a09c992367083f1cec62d18e)
* **Deployment Tx**: [`0x9f85fdde97a1149000f0ae4230daea2908c1d123701ff20c393d85a6b1031e46`](https://shannon-explorer.somnia.network/tx/0x9f85fdde97a1149000f0ae4230daea2908c1d123701ff20c393d85a6b1031e46)
* **Solidity Version**: `^0.8.20`
* **Target Network**: Somnia Shannon Testnet (`Chain ID: 50312`)
* **Currency**: Native `STT` / `$SOM`

### Core Smart Contract Interfaces

```solidity
// Anchor a cryptographic decision receipt hash
function anchorReceipt(bytes32 receiptHash, string calldata marketId) external;

// Anchor a decision receipt with payable native $SOM stake
function anchorReceiptWithStake(bytes32 receiptHash, string calldata marketId) external payable;

// Record a verified forecaster soulbound reputation badge
function recordForecasterBadge(address forecaster, string calldata tier, uint256 brierScoreBps) external;

// Retrieve an anchored receipt
function getReceipt(bytes32 receiptHash) external view returns (
    bytes32 hash,
    string memory marketId,
    uint256 timestamp,
    address owner,
    uint256 stakeAmount
);

// Retrieve a forecaster's soulbound badge
function getForecasterBadge(address forecaster) external view returns (
    string memory tier,
    uint256 brierScoreBps,
    uint256 totalAnchored,
    uint256 lastUpdated
);
```

---

## 7. Quickstart & Deployment Guide

### Prerequisites
* **Node.js**: `v22.x` or higher
* **Package Manager**: `pnpm` (or `npm`)

### 1. Installation
```bash
# Clone repository
git clone https://github.com/0xaje/ProofCast.git
cd ProofCast

# Enable Corepack & Install dependencies
corepack enable
pnpm install
```

### 2. Running Locally
```bash
# Start development server
pnpm dev
```
The application will be accessible at `http://localhost:3000`.

### 3. Smart Contract Compilation & Deployment
```bash
# Compile ProofCastAnchor.sol
npm run contracts:compile

# Deploy to Somnia Shannon Testnet
SOMNIA_DEPLOYER_PRIVATE_KEY=0x... npm run contracts:deploy
```

### 4. Running Test Suite & Quality Gates
```bash
# Run full Vitest test suite
pnpm test

# Run strict TypeScript typechecking
pnpm check

# Run production bundle build
pnpm build
```

---

## 8. Test Verification & Health Summary

```
 RUN  v2.1.9 /home/oyeolorun/ProofCast

 ✓ server/auth.logout.test.ts (1 test)
 ✓ server/dreamdex.test.ts (3 tests)
 ✓ server/eventforge.multimodel.test.ts (5 tests)
 ✓ server/eventforge.test.ts (7 tests)
 ✓ server/oracle.staking.test.ts (5 tests)
 ✓ server/receipts.test.ts (16 tests)
 ✓ server/scoring.api.test.ts (1 test)
 ✓ server/scoring.integration.test.ts (1 test)
 ✓ client/src/lib/comparisonMotion.test.ts (3 tests)

 Test Files  9 passed (9)
      Tests  42 passed (42)
 TypeScript  0 diagnostics (tsc --noEmit clean)
 Production  Clean bundle build successful
```

---

## 9. Security & Trust Model

| Security Dimension | Enforcement Mechanism |
| :--- | :--- |
| **Zero Private Key Custody** | All transactions and EIP-712 hashes are signed in the browser wallet via RainbowKit / Viem. The server never handles private keys. |
| **Model Invariance** | Layer A deterministic calculations are mathematically isolated from LLM output. AI cannot modify probabilities or prices. |
| **Cryptographic Immutability** | Commitments produce a SHA-256 digest anchored permanently to [ProofCastAnchor.sol](contracts/ProofCastAnchor.sol) on Somnia. |
| **Webhook Authentication** | `POST /api/oracle/resolve` requires valid `ORACLE_WEBHOOK_SECRET` authentication to prevent unauthorized resolution spoofing. |
| **Duplicate Prevention** | `ProofCastAnchor.sol` reverts with `AlreadyAnchored` on replay attempts for previously anchored receipt hashes. |

---

## 10. Hackathon Submission & Resources

* **Live Submission Guide**: [SUBMISSION_DEMO_GUIDE.md](SUBMISSION_DEMO_GUIDE.md)
* **System Audit**: [LIVE_SYSTEM_VERIFICATION.md](LIVE_SYSTEM_VERIFICATION.md)
* **Smart Contract**: [contracts/ProofCastAnchor.sol](contracts/ProofCastAnchor.sol)
* **Somnia Explorer**: [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network)

---

## 11. License

ProofCast is open-source software licensed under the [MIT License](LICENSE).




