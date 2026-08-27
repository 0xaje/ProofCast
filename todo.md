# Proofcast Signal Room Shell Unification

- [x] Inventory the current route and component boundaries for shell inconsistencies.
- [x] Extract the persistent desktop rail, compact mobile navigation, top utility bar, and connection card into shared primitives.
- [x] Create dedicated Command Center, Market Decision, and Proof Profile routes that all use the shared shell.
- [x] Align the operational 404 route with the same shell, mark, provenance, and return path.
- [x] Verify desktop and mobile layouts, then typecheck, build, screenshot, and checkpoint the update.

## Repository cleanup and push

- [x] Inspect the configured remote, branch, commit history, and uncommitted changes.
- [x] Identify obsolete tracked project material and confirm the safe cleanup scope: the working tree contains the current codebase; older versions exist only in Git history.
- [x] Commit the unified Signal Room codebase and push it to the configured remote.
- [x] Verify the remote branch includes the new commit and report the result: `origin/main` matches checkpoint `f89c797`.

## DreamDEX real-data integration spike

- [x] Verify the current official DreamDEX market discovery, event-contract, order-book, and network interfaces.
- [x] Determine whether a secure backend data proxy is required for reliable production access: use a server-validated official SDK integration as the single source of truth.
- [x] Upgrade the project architecture for the selected server-validated data layer.
- [x] Implement real market snapshot retrieval with LIVE, STALE, and UNAVAILABLE handling.
- [x] Validate provenance, disable all execution controls, and create the live-source checkpoint.

## Full-stack upgrade recovery

- [x] Restore the Signal Room routes after the full-stack template merge while retaining tRPC providers.
- [x] Implement the typed server-side DreamDEX snapshot procedure using the official read-only SDK.
- [x] Wire the Signal Room to the snapshot procedure with loading, stale, unavailable, and error states.
- [x] Run typecheck, tests, production build, and browser verification after the full-stack migration.

## Query-failure behavior

- [x] Add distinct frontend query-error copy and recovery actions for DreamDEX snapshot failures.
- [x] Verify that a failed snapshot request renders an error state rather than remaining in checking mode.
- [x] Record the rendered error-state evidence for the rail and Market Decision before checkpointing.
- [x] Persist the browser-confirmed error-state evidence in the project validation record.

## Signal Room palette refresh

- [x] Define and document a lighter, distinctive Proofcast palette that avoids the existing common dark-blue dashboard aesthetic: lilac mineral canvas, plum rail, oxide action tone, aubergine analysis tone, and ochre warning tone.
- [x] Update shared backgrounds, surfaces, borders, status tones, navigation, and the global shell to the new palette.
- [x] Retune page-level accents, data visualizations, and readable text contrast across all Signal Room routes.
- [x] Verify desktop and mobile presentation, typecheck, build, and prepare the visual refresh checkpoint.

## Palette system hardening

- [x] Document the approved palette in a reusable design note with named color and semantic usage guidance.
- [x] Replace temporary global color-override selectors with a scoped Mineral Signal design system rooted at the shared Proofcast shell.
- [x] Record final visual evidence for the distinctive rail, navigation, status tones, and contrast on the refreshed routes: desktop and mobile views retain a plum rail, lilac canvas, chalk surfaces, and readable oxide/aubergine/ochre semantics.
- [x] Inspect and record final browser evidence for the Command Center, Market Decision, and Proof Profile palette treatment.
- [x] Apply necessary route-specific contrast refinements: verified the shared semantic treatment keeps each route readable without additional page-only overrides.
- [x] Record loaded-state evidence for the market cards, probability comparison, order book, status chips, and empty-state surfaces on the final palette.
- [x] Persist standalone final palette evidence for loaded market and Proof Profile empty-state surfaces.

## Universe palette correction

- [x] Define a neutral, prediction-oriented Universe palette with cosmic ink, ultraviolet, aurora teal, starlight, and amber semantic roles.
- [x] Replace the Mineral Signal shell tokens and visual treatments with the Universe palette without altering product layout or data behavior.
- [x] Verify the Universe palette across desktop and mobile Signal Room routes, then typecheck, build, and prepare the corrected design checkpoint.

## Complete judge-ready product redesign

- [x] Define a differentiated Proofcast story, premium visual direction, and landing-to-workspace information architecture for judge evaluation.
- [x] Replace the current home route with an enticing product landing page that demonstrates the proof loop from market signal to accountable record.
- [x] Create a distinctive brand visual asset and visual motif for the landing narrative.
- [x] Rebuild the command, market decision, and proof routes as a unified professional workspace reached from the landing page.
- [x] Verify the desktop/mobile judge journey, live-data states, test suite, production build, and prepare the final redesign checkpoint.

## Redesign unification pass

- [x] Confirm the finished Proof Instrument hero visual is rendered on the live landing page rather than a generation placeholder.
- [x] Apply shared Proof Instrument brand anchors and recurring evidence instruments across landing, Signal Room, Market Decision, and Proof Profile.
- [x] Re-verify the unified judge journey across desktop and mobile before checkpointing.

## Live redesign verification

- [x] Confirm in-browser that the landing hero renders the completed Proof Instrument image rather than a generation placeholder.
- [x] Record fresh desktop and mobile evidence that the landing and workspace now read as one Proof Instrument product journey.
- [x] Re-verify the unified judge journey across desktop and mobile before checkpointing.

## Post-unification evidence

- [x] Capture current desktop and mobile views of landing and workspace after the final Proof Instrument rail update.
- [x] Record browser-observable evidence that the completed hero asset is rendered in the landing hero and that all routes preserve the same proof-loop brand language.
- [x] Persist the direct served-asset verification and route-by-route Proof Instrument evidence in the project record.

## Proof Instrument workspace unification

- [x] Audit and remove visual remnants of the older dark dashboard system from the shared workspace shell and page routes.
- [x] Apply the landing page’s warm titanium field, Carbon panels, Signal Vermilion, Acid Chartreuse, proof-seal, and editorial border language to the Signal Room shell.
- [x] Restyle Command Center, Market Decision, and Proof Profile so their information hierarchy and signature instruments feel like the landing page’s professional Proof Instrument product.
- [x] Verify the unified landing-to-workspace handoff across desktop and mobile, then typecheck, build, and prepare the refinement checkpoint.

## Route-level Proof Instrument composition

- [x] Rebuild the Command Center as an asymmetric proof-loop surface with one dominant live-signal object and supporting evidence instruments.
- [x] Rebuild Market Decision around a main commitment surface, a persistent comparison instrument, and a distinct evidence column.
- [x] Rebuild Proof Profile around an editorial receipt form and structured accountable empty states.
- [x] Re-verify the persistent Proof Instrument rail and unified routes after the route-level redesign.

## Proof Instrument interaction polish

- [x] Audit shared Carbon evidence panels, primary controls, navigation items, and evidence instruments for consistent hover and focus treatment.
- [x] Add restrained transform, border, shadow, and color transitions to interactive panels and buttons.
- [x] Verify motion behavior and reduced-motion support across desktop and mobile, then typecheck, build, and prepare the polish checkpoint.

## Interaction validation evidence

- [x] Document the shared panel, button, navigation, and evidence-instrument motion coverage.
- [x] Capture post-change mobile views and confirm reduced-motion safeguards remain in the shared stylesheet.
- [x] Persist standalone interaction-motion evidence for shared panels, buttons, navigation, and reduced-motion behavior.
- [x] Save and record the finalized interaction-polish checkpoint: `db69b00d`.

## Source-aware comparison animation

- [x] Identify the comparison-band source fields and local forecast state that should trigger bar motion: verified `asOf` snapshot values and the local forecast state.
- [x] Animate Market and EventForge bars only after a new verified source snapshot changes their displayed values.
- [x] Animate the You bar only after an intentional local forecast adjustment, while preserving reduced-motion behavior.
- [x] Validate source-aware motion behavior, typecheck, test, build, and prepare the refinement checkpoint.

## Explicit comparison animation gating

- [x] Key Market and EventForge bar animation to a verified snapshot timestamp plus a changed displayed source value.
- [x] Key You bar animation to an intentional local forecast-input revision only.
- [x] Add unit coverage for the animation-trigger decision logic and prepare the validated refinement checkpoint.

## Public GitHub publication

- [x] Inspect the local Git state and the target `0xaje/ProofCast` repository’s branch and history: local `main` is at `345a7f2`; the public target is an empty repository.
- [x] Configure the target public remote without losing the latest Proofcast project history.
- [x] Push the latest complete Proofcast codebase to the target public repository.
- [x] Verify the public repository contains the current project baseline and report the result: public `main` matches local commit `926d066`.

## Open-source repository foundation

- [x] Audit current package scripts, runtime configuration, and public-repository files for accurate contribution guidance.
- [x] Write a comprehensive README covering Proofcast’s thesis, architecture, local setup, live-demo instructions, safety boundaries, and contribution workflow.
- [x] Add an open-source license and a safe environment configuration template containing only non-secret configuration names and instructions: the MIT license is added, and the approved `docs/environment-template.md` replacement documents safe local values without exposing a raw environment file.
- [x] Add GitHub Actions CI to install dependencies, run tests, typecheck, and build on pushes and pull requests.
- [x] Validate the new repository foundation locally, publish it to public `main`, and verify the remote commit: tests, typecheck, and build passed; public `main` matches `f305a77`.

## Safe public environment-template replacement

- [x] Add `docs/environment-template.md` as the approved non-secret contribution configuration template, with precise variable descriptions and local setup instructions.
- [x] Link the public configuration template from the README and replace the earlier raw `.env.example` reference.
- [x] Revalidate the completed public contribution foundation: documentation linkage passed, as did tests, TypeScript check, and production build; checkpoint, commit, and publication are next.

## Product and engineering roadmap assessment

- [x] Inventory the present frontend, backend, live-data, persistence, security, testing, and documentation state.
- [x] Assess product completeness and technical readiness against Proofcast’s accountable forecasting thesis.
- [x] Produce a prioritized, milestone-based roadmap identifying what to build next and what remains intentionally out of scope in `docs/product-roadmap-assessment.md`.

## Decision Receipt v1 backend

- [x] Design the immutable forecast, server-captured market snapshot, and Decision Receipt schema with user ownership and integrity constraints.
- [x] Generate and apply the database migration, then verify the live schema.
- [x] Add database helpers and protected tRPC procedures for receipt creation, listing, and detail retrieval.
- [x] Add validation, owner scoping, transaction-boundary safeguards, and protected API tests for the Decision Receipt workflow.
- [x] Run the full quality suite: 12 tests passed, TypeScript check passed, production build passed, and database schema verification passed; checkpoint and frontend wiring remain as the next handoff.

## Decision Receipt frontend workflow

- [x] Audit the receipt API contracts, authentication behavior, existing routes, and available browser-test tooling.
- [x] Implement Market Decision as a Draft → Review → Commit flow using the protected receipt mutation.
- [x] Update Proof Profile to load and display the authenticated owner’s receipt ledger with detail inspection.
- [x] Add browser integration coverage for commit, refresh, and receipt inspection, plus regression checks; the passing Playwright flow mocks the protected API boundary while exercising the real UI.
- [x] Run the full quality suite: 12 unit tests, Playwright browser integration flow, authenticated database-backed receipt E2E, TypeScript check, production build, and visual route verification passed.

- [x] Add and execute a true authenticated database-backed receipt E2E test with a test-only auth header, test-only DreamDEX fixture, disposable local/CI MySQL service, and migration step; the mocked browser integration test remains available for fast local validation.

## Project status and next-phase review

- [x] Review the latest checkpoint, repository state, active routes, backend capabilities, and validation results.
- [x] Separate demo-ready capabilities from unfinished product infrastructure and intentional safety boundaries.
- [x] Define and document the next implementation phase with ordered milestones and acceptance criteria in `docs/product-roadmap-assessment.md`.

## Receipt revisions and resolution evidence

- [x] Audit the current receipt schema, helpers, protected procedures, and Proof Profile extension points.
- [x] Add immutable receipt revision and verified resolution-evidence tables with a reviewed migration.
- [x] Implement protected revision and resolution procedures with owner scoping and verification rules.
- [x] Update Proof Profile to show revision history and resolution evidence without implying scores prematurely.
- [x] Add validation, ownership, immutability, migration, API, administrator verification, and browser coverage for revisions and evidence.
- [x] Run the full quality suite: 14 unit tests, TypeScript check, production build, schema verification, and both mocked and authenticated database-backed browser flows passed; calibration/scoring remains the next product phase.

## Verified outcome scoring and calibration metrics

- [x] Audit the current receipt, revision, resolution, and Proof Profile contracts for scoring extension points.
- [x] Define transparent scoring and calibration formulas with explicit verified, rejected, unresolved, and void handling.
- [x] Implement server-side scoring and owner-scoped calibration procedures with tests.
- [x] Update Proof Profile with verified score and calibration metrics while preserving honest empty states.
- [x] Add protected API and browser coverage, run the full validation suite, and verify scoring against the existing resolution schema; no new migration was required.

## Scoring coverage hardening

- [x] Add a focused owner-isolation test proving calibration aggregation excludes another user’s receipts and resolutions.
- [x] Add an explicit calibration-metrics error state and retry action in Proof Profile.
- [x] Add API and browser coverage proving a VERIFIED non-VOID outcome produces visible accuracy, Brier, and calibration-bin metrics.
- [x] Save a new checkpoint after scoring/calibration coverage is complete and validated.

## Calibration coverage completion

- [x] Add a direct `getCalibrationMetrics` test with mixed-user receipt and resolution fixtures proving foreign data is excluded end to end.
- [x] Add a protected API-level metrics test asserting verified non-void scoring values and calibration bins.
- [x] Save a new checkpoint after the final scoring tests and build pass.

## Final calibration API realism

- [x] Replace the mocked calibration API test with an unmocked protected procedure test using deterministic verified non-void receipt/resolution fixtures and the real aggregation/scoring path.
- [x] Save a new checkpoint after the final calibration coverage passes; unit tests, TypeScript validation, production build, and verified browser coverage passed.

## Resolution-aware scoring, review queue, and calibration trends

- [x] Audit revision timestamps, resolution evidence, admin procedures, metrics contracts, and Proof Profile layout.
- [x] Define resolution-time scoring semantics and evidence-source validation rules.
- [x] Score the forecast revision active when evidence was verified, without rewriting the original commitment.
- [x] Validate evidence URLs and add an administrator review-queue API with owner-safe review transitions.
- [x] Build an administrator review queue and a verified-history calibration trend chart with truthful empty states.
- [x] Add direct scoring, source-validation, API, ownership, and browser coverage; run validation and checkpoint the release.

## Admin review, evidence integrity, and CSV export

- [x] Audit resolution schema, verification procedures, admin identity checks, metrics output, and route structure.
- [x] Add additive reviewer-note and evidence-integrity fields with a reviewed migration.
- [x] Implement reviewer-note persistence, strict admin queue procedures, and server-side evidence hash commitments.
- [x] Add an admin-only review route and reviewer-note controls with truthful source-integrity states.
- [x] Add owner-scoped CSV export for verified calibration history.
- [x] Add schema, API, ownership, hash, notes, CSV, and browser coverage; run validation and checkpoint the release.

## DreamDEX Event Contracts Capability Verification (Priority 0)

- [x] Inspect official `@somnia-chain/markets-sdk` v0.28.0 APIs, binary pool interfaces, order parameters, resolution events, and payout redemption.
- [x] Produce comprehensive `docs/dreamdex-capabilities.md` capability report.

## Automated DreamDEX Resolution Engine (Priority 1)

- [x] Implement backend `server/resolutionWorker.ts` to monitor unresolved receipts against live Somnia event contracts.
- [x] Automatically extract on-chain `winningOutcome` and create verified `receipt_resolutions` records with SHA-256 evidence hashes.
- [x] Trigger automated Brier scoring and calibration progression.

## EventForge Intelligence v1 (Priority 2)

- [x] Build Layer A `server/eventforge/model.ts` deterministic probability and confidence calculation.
- [x] Build Layer B `server/eventforge/reasoning.ts` structured AI analysis (Bull/Bear/Risks/Disagreement).
- [x] Wire live EventForge comparison bar and intelligence drawer in `MarketDecision.tsx`.

## Somnia Smart Contract Anchoring (Priority 4)

- [x] Write lightweight `contracts/ProofCastAnchor.sol` for anchoring SHA-256 hashes to Somnia blockchain.
- [x] Add receipt anchoring procedure and Somnia Shannon Block Explorer links in `ProofProfile.tsx`.

## Market Quality & Executable Edge (Priorities 5 & 6)

- [x] Implement deterministic `TRADEABLE` / `WATCH` / `NO_TRADE` engine in `server/marketQuality.ts`.
- [x] Implement true `server/executableEdge.ts` calculating net edge after spread crossing and slippage.
- [x] Integrate live quality chips and edge metrics in Market Decision and Decision Receipts.

## Decision Receipt Schema Evolution (Priority 7 & 8)

- [x] Extend `drizzle/schema.ts` with model estimates, market quality, executable edge, and Somnia anchor fields.
- [x] Generate migration `0003_eventforge_execution_anchoring.sql`.
- [x] Add 7 new passing unit tests in `server/eventforge.test.ts` (total 28 passing tests).
- [x] Verify full TypeScript check and production build.

