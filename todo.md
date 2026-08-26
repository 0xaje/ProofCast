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
