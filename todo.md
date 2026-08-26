# Proofcast Signal Room Shell Unification

- [x] Inventory the current route and component boundaries for shell inconsistencies.
- [x] Extract the persistent desktop rail, compact mobile navigation, top utility bar, and connection card into shared primitives.
- [x] Create dedicated Command Center, Market Decision, and Proof Profile routes that all use the shared shell.
- [x] Align the operational 404 route with the same shell, mark, provenance, and return path.
- [x] Verify desktop and mobile layouts, then typecheck, build, screenshot, and checkpoint the update.

## Repository cleanup and push

- [x] Inspect the configured remote, branch, commit history, and uncommitted changes.
- [x] Identify obsolete tracked project material and confirm the safe cleanup scope: the working tree contains the current codebase; older versions exist only in Git history.
- [ ] Commit the unified Signal Room codebase and push it to the configured remote.
- [ ] Verify the remote branch includes the new commit and report the result.

## DreamDEX real-data integration spike

- [x] Verify the current official DreamDEX market discovery, event-contract, order-book, and network interfaces.
- [x] Determine whether a secure backend data proxy is required for reliable production access: use a server-validated official SDK integration as the single source of truth.
- [x] Upgrade the project architecture for the selected server-validated data layer.
- [x] Implement real market snapshot retrieval with LIVE, STALE, and UNAVAILABLE handling.
- [x] Validate provenance and disable all execution controls; live-source checkpoint remains to be created.

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
