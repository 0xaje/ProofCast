<div align="center">

# ↗ proofcast
### *Predictions are cheap. Proof is not.*

**The forecasting intelligence and cryptographic accountability layer for Somnia DreamDEX Event Contracts.**

[![Somnia Network](https://img.shields.io/badge/Network-Somnia_Shannon_Testnet-c8f06a?style=for-the-badge&logo=ethereum&logoColor=080b10)](https://shannon-explorer.somnia.network)
[![Smart Contract](https://img.shields.io/badge/Solidity-0.8.20_Verified-f04b2f?style=for-the-badge&logo=solidity&logoColor=white)](contracts/ProofCastAnchor.sol)
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

> [!IMPORTANT]
> **Core Product Thesis**: Prediction markets show what the crowd prices. ProofCast records what a forecaster believed *before* the outcome was known, preserves *why* they believed it, and measures whether that judgment was empirically calibrated.

---

## 🏛️ The 7-Step Verified Lifecycle

ProofCast transforms speculative market noise into immutable decision intelligence across 7 deterministic phases:

$$\mathbf{OBSERVE} \longrightarrow \mathbf{UNDERSTAND} \longrightarrow \mathbf{CHALLENGE} \longrightarrow \mathbf{COMMIT} \longrightarrow \mathbf{ANCHOR} \longrightarrow \mathbf{RESOLVE} \longrightarrow \mathbf{PROVE}$$

```mermaid
flowchart LR
  subgraph PreDecision [1. Intelligence & Challenge]
    A["01. Observe: Live DreamDEX Market Signal"] --> B["02. Understand: EventForge Multi-Model AI"]
    B --> C["03. Challenge: Counter-Thesis & Invalidation Triggers"]
  end

  subgraph Commitment [2. Cryptographic Commitment]
    C --> D["04. Commit: EIP-712 SHA-256 Decision Receipt"]
    D --> E["05. Anchor: Somnia Smart Contract + $SOM Stake"]
  end

  subgraph Accountability [3. Automated Resolution & Scoring]
    E --> F["06. Resolve: 100% Automated Oracle Settlement"]
    F --> G["07. Prove: Brier Score Calibration & Soulbound SBT"]
  end

  style A fill:#0c1a16,stroke:#c8f06a,stroke-width:2px,color:#c8f06a
  style D fill:#16120c,stroke:#f59e0b,stroke-width:2px,color:#fcd34d
  style E fill:#1a0c0c,stroke:#f04b2f,stroke-width:2px,color:#f87171
  style G fill:#080b10,stroke:#38bdf8,stroke-width:2px,color:#38bdf8
```

---

## ⚡ Implemented Capabilities (Source of Truth)

### 1. 📡 Live Somnia DreamDEX Market Discovery
- **SDK Integration**: Direct live querying via `@somnia-chain/markets-sdk` reading Somnia DreamDEX binary event pools.
- **Order Book Microstructure**: Real-time bid/ask spreads, midpoints, depth levels, and time-to-expiry.
- **Honest Telemetry States**: Explicit `LIVE`, `STALE`, `UNAVAILABLE`, and `ERROR` states with a 5-second in-memory TTL cache to eliminate redundant indexer load.

### 2. 🧠 EventForge Dual-Layer AI Engine & SSE Streaming
- **Layer A (Deterministic Microstructure Engine)**: Pure mathematical model calculating objective fair value based on order-book depth imbalance, spread penalty, and time decay. Output is 100% deterministic: identical market inputs yield identical probability outputs.
- **Layer B (Multi-Model AI Reasoning & Live Streaming)**: Async structured inference generating Bull Case, Bear Case, Counter-Thesis, and Disagreement Analysis across supported models (Microstructure, Claude, Gemini, DeepSeek, and Meta-Ensemble).
- **Server-Sent Events (SSE)**: Mounted at `GET /api/eventforge/stream` for real-time token-by-token reasoning streaming.

> [!NOTE]
> **Hard Invariant**: The deterministic mathematical model is completely isolated from LLM output. AI models cannot alter numerical probabilities, fabricate order books, or mutate market prices.

### 3. 🎯 Triangulated Comparison & Executable Edge
- **3-Way Comparison**: Visual comparison between **Market Mid-Price**, **EventForge Fair Value**, and **User Forecast**.
- **Deterministic Market Quality**: Classifies markets into `"TRADEABLE" | "WATCH" | "NO_TRADE"`.
- **True Executable Edge**: Calculates net edge after accounting for spread crossing and execution friction.

### 4. 🔏 Cryptographic EIP-712 Receipts & Evidence Hashing
- **EIP-712 Typed Signing**: Standardized typed data verification (`domain: { name: "ProofCast", chainId: 50312 }`, primary type: `ForecastCommitment`) verified via `viem`.
- **SHA-256 Digest**: Freezes market snapshot, probability, direction, thesis, counter-thesis, and timestamp into an immutable 32-byte hash.
- **Parent-Linked Revision Chains**: Historical forecasts are never overwritten; corrections create parent-linked `forecast_revisions`.

### 5. 🛡️ Somnia Smart Contract Anchoring & Staking (`ProofCastAnchor.sol`)
- **Non-Custodial Anchoring**: Stores `(receiptHash, marketId, timestamp, owner, stakeAmount)`.
- **Payable $SOM Staking**: `anchorReceiptWithStake()` allows forecasters to stake native Somnia tokens behind high-conviction predictions.
- **Soulbound Forecaster Badges**: `recordForecasterBadge()` registers verified reputation tiers (`GOLD_MASTER`, `SILVER`, `BRONZE`, `UNRANKED`) directly on-chain.

### 6. ⚙️ Automated Resolution Worker & Oracle Webhooks
- **Automated Daemon Worker**: `server/resolutionWorker.ts` polls on-chain DreamDEX settlement status every 60 seconds without manual admin bottlenecks.
- **Oracle Webhook**: `POST /api/oracle/resolve` enables instant settlement for UMA / Chainlink oracles with `ORACLE_WEBHOOK_SECRET` authentication.
- **Automated Stake Resolution**: Automatically transitions stakes to `WON`, `LOST`, or `REFUNDED`.

### 7. 📊 Brier Calibration & Soulbound Reputation Tiers
- **Strict Brier Scoring**: Dimensionless $BS = (f - o)^2 \in [0, 1]$, where $0.000$ represents perfection.
- **Lead-Time Logarithmic Weighting**: Skill bonus for early commitments ($w = 1 + \ln(1 + \Delta t / 86400)$).
- **5-Bin Empirical Calibration**: Evaluates reliability across $[0-20\%]$, $[20-40\%]$, $[40-60\%]$, $[60-80\%]$, $[80-100\%]$.
- **Reputation Tier Matrix**:
  | Tier | Title | Requirements |
  | :--- | :--- | :--- |
  | 🥇 **Gold Master** | `Gold Master Oracle` | $\ge 30$ verified receipts, $BS \le 0.12$, Accuracy $\ge 70\%$ |
  | 🥈 **Silver** | `Silver Superforecaster` | $\ge 15$ verified receipts, $BS \le 0.18$, Accuracy $\ge 60\%$ |
  | 🥉 **Bronze** | `Bronze Forecaster` | $\ge 5$ verified receipts, $BS \le 0.25$, Accuracy $\ge 50\%$ |
  | 🔰 **Unranked** | `Unranked Apprentice` | $< 5$ verified receipts |

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
  subgraph Browser_Client ["Client Layer (React 19 / Vite / Tailwind)"]
    Landing["Landing Page (Editorial Hero & Live Telemetry)"]
    SignalRoom["Signal Room (Market Discovery & Order Books)"]
    Decision["Decision Workspace (Triangulated Comparison & SSE)"]
    Profile["Proof Profile (Anchors, Receipts & CSV Export)"]
    Leaderboard["Leaderboard (Rankings & Soulbound Badges)"]
    ConnectPill["Web3 Connect Status Widget"]
  end

  subgraph Server_Backend ["Server Backend (Express 4 / tRPC / Node.js)"]
    TRPC["tRPC API Router"]
    DreamDEXService["DreamDEX Snapshot Service (5s TTL Cache)"]
    EventForgeEngine["EventForge Multi-Model Engine"]
    SSEHandler["SSE Stream (/api/eventforge/stream)"]
    WorkerDaemon["Resolution Worker Daemon (60s Polling)"]
    OracleWebhook["Oracle Webhook (/api/oracle/resolve)"]
    ScoringEngine["Brier Scoring & Calibration Engine"]
  end

  subgraph Somnia_Blockchain ["Somnia Network (Chain ID 50312)"]
    DreamDEXPools["DreamDEX Binary Event Contracts"]
    AnchorContract["ProofCastAnchor.sol (Anchors, Stakes, SBTs)"]
  end

  subgraph Storage_Layer ["Database Layer (Drizzle ORM / MySQL)"]
    DBSnapshots[("market_snapshots")]
    DBForecasts[("forecasts")]
    DBReceipts[("decision_receipts")]
    DBRevisions[("forecast_revisions")]
    DBResolutions[("receipt_resolutions")]
  end

  SignalRoom --> TRPC
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

  DreamDEXService --> DreamDEXPools
  WorkerDaemon --> DreamDEXPools
  WorkerDaemon --> DBResolutions
  OracleWebhook --> DBResolutions

  Decision -. EIP-712 Sign & Stake .-> AnchorContract
  Profile -. Verify Anchor .-> AnchorContract
```

---

## 🔒 Web3 Security & Trust Model

| Security Dimension | Enforcement Mechanism |
| :--- | :--- |
| **Zero Private Key Custody** | All transactions and EIP-712 hashes are signed in the browser wallet via RainbowKit / Viem. The server never handles private keys. |
| **Model Invariance** | Layer A deterministic calculations are mathematically isolated from LLM output. AI cannot modify probabilities or prices. |
| **Cryptographic Immutability** | Commitments produce a SHA-256 digest anchored permanently to [ProofCastAnchor.sol](contracts/ProofCastAnchor.sol) on Somnia. |
| **Webhook Authentication** | `POST /api/oracle/resolve` requires valid `ORACLE_WEBHOOK_SECRET` authentication to prevent unauthorized resolution spoofing. |
| **Duplicate Prevention** | `ProofCastAnchor.sol` reverts with `AlreadyAnchored` on replay attempts for previously anchored receipt hashes. |

---

## 🧪 Quality Gate & Test Verification

```bash
# Run full unit & integration test suite (9 test files, 42 tests)
npx vitest run

# Run strict TypeScript typechecking (0 errors)
npx tsc --noEmit

# Run production build
npm run build
```

```
 RUN  v2.1.9 /home/oyeolorun/ProofCast

 ✓ server/auth.logout.test.ts (1 test)
 ✓ server/comparisonMotion.test.ts (3 tests)
 ✓ server/dreamdex.test.ts (3 tests)
 ✓ server/eventforge.multimodel.test.ts (5 tests)
 ✓ server/eventforge.test.ts (7 tests)
 ✓ server/oracle.staking.test.ts (5 tests)
 ✓ server/receipts.test.ts (16 tests)
 ✓ server/scoring.api.test.ts (1 test)
 ✓ server/scoring.integration.test.ts (1 test)

 Test Files  9 passed (9)
      Tests  42 passed (42)
 TypeScript  0 diagnostics (tsc --noEmit clean)
 Build       Clean production bundle (135.0 kB)
```

---

## 📌 GitHub Repository Metadata (For Right-Hand Sidebar)

Use the following settings for the repository's "About" section on GitHub:

* **Description**:
  > Forecasting intelligence & cryptographic accountability platform for Somnia DreamDEX Event Contracts. Multi-model AI reasoning, EIP-712 SHA-256 Decision Receipts, payable $SOM staking, on-chain Soulbound reputation badges, and automated Brier calibration.
* **Website**:
  > `https://proofcast.somnia.network` *(or deployment domain)*
* **Topics / Tags**:
  ```text
  somnia, somnia-network, dreamdex, prediction-markets, eip-712, sha-256, brier-score, calibration, event-contracts, smart-contracts, solidity, typescript, trpc, web3, ai-reasoning, soulbound-tokens
  ```

---

## 📜 License

ProofCast is open-source software licensed under the [MIT License](LICENSE).


