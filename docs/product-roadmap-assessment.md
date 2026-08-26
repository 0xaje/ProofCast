# ProofCast product and engineering assessment

**Assessment date:** 26 August 2026  
**Basis:** Current source tree, live snapshot procedure response, automated tests, CI workflow, runtime logs, and visual review of `/`, `/signal`, `/market`, and `/proof`.

> **Bottom line:** ProofCast has a compelling, polished, and honest **product shell** plus a genuinely read-only DreamDEX market-data service. It is **not yet a complete forecasting product** because it cannot save a user forecast, create a durable Decision Receipt, retrieve resolution evidence, or calculate performance from real records. The next build should therefore be **Decision Receipt v1**, not wallet trading or more surface-level design work.

## 1. What is complete today

| Product area | Status | Evidence and assessment |
|---|---|---|
| Public product story | **Complete for a judge/demo** | The landing page makes the Observe → Commit → Prove thesis clear and links directly into the workspace. |
| Design system and core routes | **Complete as a v1 interface** | The landing page, Signal Room, Market Decision, and Proof Profile share the same Proof Instrument language and responsive layout. |
| Live public market context | **Implemented and working** | The public `dreamdex.snapshot` procedure returned a `LIVE` Somnia mainnet snapshot during review, with live Event Contract metadata and YES book levels. |
| Data honesty | **Strong** | The server exposes `LIVE`, `STALE`, and `UNAVAILABLE`; the client also distinguishes query `ERROR`. Screens do not substitute mock values when a source is unavailable. |
| Read-only safety boundary | **Strong** | The DreamDEX server service explicitly creates no wallet, signer, balance, approval, transaction, order, cancellation, settlement, or redemption path. |
| Public-repository foundation | **Complete** | The repository has a README, MIT License, safe configuration guidance, and CI that runs test, typecheck, and build checks. |

## 2. What is not complete

### Frontend

The **visual frontend is effectively complete for the current demo**, but the **functional product frontend is not complete**. The Market Decision screen can change a local slider and show a temporary “Local forecast noted” message, but that forecast disappears on refresh. The Proof Profile is correctly an empty accountable state, not a ledger. The EventForge lane is intentionally disconnected, and Search, Notifications, Settings, and the “Operator workspace” identity are presentational affordances rather than real flows.

The visual review also confirms that the application does the right thing during initial live-data loading: it withholds values and renders a loading state. The next UX pass should make this transition more informative by adding a compact source-retry/freshness message instead of leaving a large blank loading panel for the first request.

### Backend and data model

The backend is a **working read-only market adapter**, not yet a full product backend. `drizzle/schema.ts` has only the OAuth-backed `users` table. `server/db.ts` only creates user records and retrieves them. The tRPC router exposes authentication and one public DreamDEX snapshot query; it has no protected procedure to create, retrieve, version, or resolve forecasts and receipts.

There is also no persistent snapshot store, model-estimate service, outcome-resolution service, market catalogue/search index, audit history, user notification workflow, or telemetry layer. The in-memory stale cache is a sensible short fallback, but it is process-local and cannot provide durable market evidence for a Decision Receipt.

### Test and operations readiness

The local quality gate is healthy: six server tests passed, TypeScript passed, and the production build passed. CI repeats these commands on push and pull request. However, the coverage is narrow: Vitest includes only `server/**/*.test.ts`, so the client-side comparison-motion tests are not executed. There are no browser-flow tests, no authenticated persistence tests, no real tRPC contract tests for receipt creation, and no controlled tests for live-source failures or stale-cache behavior.

## 3. The correct next product decision

Build **Decision Receipt v1**. This is the smallest feature that turns ProofCast from an impressive market-intelligence interface into a usable accountable-forecasting product. It also validates the central thesis before spending effort on EventForge modelling, execution, or advanced analytics.

Decision Receipt v1 should let an authenticated user select a live market, enter a probability, direction, confidence, thesis, and counter-thesis, then intentionally commit that decision. On commit, the server must capture an immutable market-reference snapshot from the verified DreamDEX response and return a durable receipt identifier. The user can view that receipt in Proof Profile after refresh and cannot silently edit its committed evidence. A correction must create a later revision rather than overwrite the original.

## 4. Recommended build sequence

| Priority | Milestone | Why it comes now | Acceptance criteria |
|---:|---|---|---|
| **P0** | Product hardening before persistence | Removes small demo-only rough edges before records become durable. | Centralized live-snapshot query state; explicit loading/retry copy; disabled or labelled placeholder header controls; stale server path removed or documented. |
| **P1** | Decision Receipt v1 | Delivers the first real ProofCast unit of value. | Authenticated user can save one immutable forecast with its server-captured market snapshot and find it in their own Proof Profile after refresh. |
| **P2** | Receipt ledger and revision policy | Turns saved objects into an inspectable personal history. | Paginated per-user receipt list, receipt detail route, immutable commitment timestamps, explicit draft/committed/revised state, and ownership enforcement. |
| **P3** | Resolution evidence and calibration | Makes “Prove” real without claiming results prematurely. | A verified resolution record can be attached; scores remain unavailable until a documented minimum resolved sample is met. |
| **P4** | EventForge estimate service | Adds the model lane only when provenance can be recorded. | Each estimate stores model/version, inputs, timestamp, explanation/evidence references, and availability state; no synthetic model values. |
| **P5** | Market discovery and watchlist | Improves repeated use after the proof loop works. | Search, filtering, market selection, and an optional user-owned watchlist work against verified market metadata. |

## 5. Decision Receipt v1 data contract

The initial database design should preserve both the user’s commitment and the market context that was visible at commit time. Use UTC timestamps and user ownership on every record.

| Record | Core fields | Integrity rule |
|---|---|---|
| `forecast` | `id`, `userId`, `marketId`, `direction`, `probabilityBps`, `confidence`, `thesis`, `counterThesis`, `status`, `committedAt` | A committed forecast cannot be overwritten; a later correction becomes a revision. |
| `marketSnapshot` | `id`, `marketId`, `capturedAt`, `network`, `chainId`, `sourceAsOf`, `provenance`, `question`, `marketState`, `bestBid`, `bestAsk`, `mid`, `bookJson` | Captured by the server at commit time, not supplied by the browser. |
| `decisionReceipt` | `id`, `userId`, `forecastId`, `marketSnapshotId`, `modelEstimateId?`, `version`, `createdAt` | Binds the committed forecast to immutable evidence records. |
| `receiptResolution` *(P3)* | `id`, `receiptId`, `outcome`, `resolvedAt`, `sourceUrl`, `evidenceJson`, `verifiedBy`, `createdAt` | Resolution is additive evidence; it never changes the original commitment. |
| `modelEstimate` *(P4)* | `id`, `marketId`, `modelName`, `modelVersion`, `probabilityBps`, `inputsHash`, `provenance`, `generatedAt` | Estimates are versioned and attributable, never silently replaced. |

## 6. Backend implementation plan for P1

1. Extend `drizzle/schema.ts` with `forecasts`, `marketSnapshots`, and `decisionReceipts`, including indexes on `userId`, `marketId`, and `createdAt`.
2. Generate a migration, review it, and apply it through the database migration workflow.
3. Add a focused `server/receipts/` module containing database helpers and snapshot-normalization code.
4. Add protected tRPC procedures for `receipts.create`, `receipts.listMine`, and `receipts.getMineById`. Validate all browser input with Zod.
5. Inside `receipts.create`, request the current verified DreamDEX snapshot on the server, locate the requested `marketId`, and reject the request if the source is unavailable or the market is no longer tradable for the intended use case.
6. Persist the server-captured source metadata and the user forecast in one transaction, then return the receipt ID and captured fields.
7. Update Market Decision to use a Draft → Review → Commit interaction. Require authentication only at the moment a user tries to persist; retain local draft input if sign-in is needed.
8. Replace the Proof Profile placeholder with the authenticated user’s actual receipt ledger while preserving the accountable empty state for new users.

## 7. Quality, security, and operations work that must accompany P1

| Area | Required work | Reason |
|---|---|---|
| Authorization | Use protected procedures and filter every read/write by `ctx.user.id`. | A receipt is personal evidence; users must never access another user’s records. |
| Input validation | Store probability in basis points or another integer representation; constrain direction, confidence, text length, and receipt state with Zod and database enums. | Prevent ambiguous values and malformed commitments. |
| Atomicity | Create forecast, snapshot, and receipt in one transaction. | Avoid a “saved forecast with no evidence” failure state. |
| Provenance | Store source timestamp, network, chain ID, market ID, source method, and selected book values. | Preserve the audit trail the product promises. |
| Test scope | Add unit tests for validation and revision logic, tRPC integration tests for ownership and transaction behavior, and browser tests for save → refresh → ledger. | The current six tests do not protect the core product workflow. |
| CI | Expand Vitest to include client pure-function tests; add a browser test job once the receipt flow exists. | Prevent regressions in both interface and API behavior. |
| Observability | Log snapshot latency/state changes and receipt-write failures without storing private user content in logs. | Diagnose data-source and persistence problems safely. |

## 8. What not to build next

Do **not** add real trading, wallet connection, or order execution next. These add financial, custody, and confirmation risk before ProofCast has validated its distinctive value: durable, inspectable forecasting evidence. The current explicit read-only boundary is a product strength and should remain in place through P1–P4.

Do **not** fabricate EventForge model outputs, sample receipts, historical performance, or resolved outcomes to make screens look full. Use truthful empty states until verified services and evidence exist.

Do **not** add broad social/community features, leaderboards, payments, or complex notifications before P1 proves that one user can create and review an honest receipt end to end.

## 9. Definition of “done” for the next release

The next release is complete when an authenticated user can reliably create a Decision Receipt from a selected verified market; refresh the page; see the same committed forecast and source snapshot in a private Proof Profile; and understand that the record is not a trade, prediction-market position, or claimed resolved result. The commit must be covered by automated database, API, and browser-flow tests, with all existing live-data safety states preserved.
