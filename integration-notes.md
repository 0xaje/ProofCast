# DreamDEX Integration Spike Notes

## Verified official facts

The DreamDEX Event Contracts documentation identifies `@somnia-chain/markets-sdk` as the TypeScript integration surface for Event Contracts. It explicitly states that the HTTP API covers spot only and exposes no Event Contract endpoints. The documented minimum package version is `0.28.0`, with prior versions below `0.23.0` unable to load markets and versions below `0.28.0` susceptible to off-tick price problems.

The documented discovery flow uses `SomniaMarkets.loadMarkets(true)`, binary-market narrowing with `isBinaryMarket`, `info.marketId` as the market identifier, and `fetchOrderBook(symbol, depth)` for executable book data. The documentation advises gating any write through live on-chain market status read via `exchange.client.getMarketOnchain(marketId)` and treating status `1` as trading.

For Proofcast, this means the existing static-only frontend cannot use the DreamDEX HTTP API for Event Contracts. The implementation must use the verified SDK with a chain, indexer URL, WebSocket RPC URL, and deployed-address configuration. A market is identified by `marketId`; rolling windows must be tracked through the market list rather than a pool address.

Source: https://docs.dreamdex.io/developers/event-contracts (viewed 2026-08-26).

## Verified recipe details

The documented read-first candidate method is `exchange.client.listLiveBinaryMarkets({ limit })`, optionally filtered by venue, asset, or cadence. Each candidate must be validated through `exchange.client.getMarketOnchain(marketId)` because indexer status can lag the chain. The recipe advises keying all state by `marketId`, keeping the validated snapshot for the pass, and treating successor windows as new markets.

Prices represent Up probabilities in the interval `(0, 1)`. The documentation describes the Down price as the same book read from the other side. Volumes must be divided by the deployed collateral token’s decimals; the documented example identifies 18 decimals for mainnet USDso and 6 for the testnet faucet token. The SDK’s unified tier uses human units and includes venue-aware price and size precision methods from the documented current versions.

The live-data scope for the first Proofcast integration should use market discovery, chain-status validation, current order-book retrieval, server-side snapshot timestamping, and one explicit freshness threshold. Wallet balances, orders, positions, settlement, and every signer-dependent action remain out of scope for this read-only integration spike.

Source: https://docs.dreamdex.io/developers/event-contracts/recipes (viewed 2026-08-26).

## Verified Bot Kit configuration facts

The official Bot Kit identifies the current mainnet as Somnia Shannon, chain ID `5031`, with RPC `https://api.infra.mainnet.somnia.network`. It also identifies testnet chain ID `50312` with RPC `https://dream-rpc.somnia.network`. The repository text states that contract addresses belong in its core package and should be fetched dynamically from the markets endpoint rather than hard-coded into a strategy. The visible repository history also shows the package was recently bumped to `markets-sdk` `0.28.1`.

This supports a read-only Proofcast backend that dynamically resolves SDK configuration and market metadata at startup or cache refresh, instead of embedding contract addresses in frontend code. A mainnet or testnet choice must remain an explicit deployment configuration, not an arbitrary application default.

Source: https://github.com/somnia-chain/dreamdex-bot-kit (viewed 2026-08-26).

## Official source map for the implementation

The official documentation index confirms the machine-readable paths for the remaining integration checks: Quick Start at `https://docs.dreamdex.io/developers/quick-start.md`, Event Contracts at `https://docs.dreamdex.io/developers/event-contracts.md`, Recipes at `https://docs.dreamdex.io/developers/event-contracts/recipes.md`, Contracts and Addresses at `https://docs.dreamdex.io/developers/event-contracts/contracts-and-addresses.md`, and Gotchas at `https://docs.dreamdex.io/developers/event-contracts/gotchas.md`.

The documentation index also confirms that the HTTP API is documented separately from Event Contracts. This corroborates the Event Contracts page statement that a real data integration must use the markets SDK rather than attempt to map Event Contract reads to spot HTTP endpoints.

Source: https://docs.dreamdex.io/llms.txt (viewed 2026-08-26).

## Configuration and safety constraints confirmed

The Quick Start confirms that testnet is chain ID `50312` and mainnet is chain ID `5031`; it also reinforces that market metadata such as token addresses, decimals, tick size, lot size, and minimum quantity must be read dynamically at runtime. However, it describes the spot HTTP API, not an Event Contract data replacement.

The Event Contracts addresses page confirms that core addresses are identical across the two networks but that a market and its pool must never be hard-coded. It identifies mainnet collateral as 18-decimal USDso and testnet collateral as 6-decimal tUSDC, meaning the data layer must derive decimal scaling from the live venue configuration.

The Gotchas page reinforces the safety boundary for any eventual write: validate status on chain immediately before a write, key state by `marketId`, scope markets to the intended venue, and do not infer asset or interval from question wording. The present integration remains strictly read-only: no signer, private key, wallet approval, order, cancel, mint, redemption, or settlement action is included.

Sources: https://docs.dreamdex.io/developers/quick-start.md, https://docs.dreamdex.io/developers/event-contracts/contracts-and-addresses.md, and https://docs.dreamdex.io/developers/event-contracts/gotchas.md (viewed 2026-08-26).

## Verified Event Contract endpoint configuration

The inspected official DreamDEX Bot Kit source configures its Event Contract indexer URL as `https://dev.smk.somnia.host/v1/graphql` for testnet and `https://prd.smk.somnia.host/v1/graphql` for mainnet. Its read client passes this as `indexerUrl` to the Event Contract SDK.

The first Proofcast integration will use the mainnet read-only endpoint, the SDK’s exported Somnia mainnet chain and deployed-address helpers, and no signer. The service will create one-shot SDK instances, close them after each snapshot, and return a bounded, timestamped DTO to the interface. There is no private key, wallet address, transaction, or account-level read in this phase.

Source inspected: https://github.com/somnia-chain/dreamdex-bot-kit, `packages/ec-core/src/config.ts` and `packages/ec-core/src/exchange.ts` (retrieved 2026-08-26).

## Proofcast integration verification

On 2026-08-26, the local public `dreamdex.snapshot` procedure returned `LIVE` from the configured mainnet GraphQL indexer and verified its visible books through on-chain Binary Pool reads. The returned markets included real `marketId`, `marketAddress`, `poolAddress`, asset, question, lifecycle state, window timestamps, on-chain best bid and ask, midpoint, spread, and bounded YES book depth.

The current service intentionally returns no wallet, private-key, signer, balance, order, transaction, account history, or write capability. If a fresh upstream read fails, it can only return a short-lived, labelled `STALE` snapshot; after that it returns `UNAVAILABLE` with no substituted market data.

The Signal Room was also forced through an invalid snapshot request during development. Its shared rail changed to `ERROR`, displayed a source-withheld explanation, and surfaced a retry action; the Market Decision view changed to a dedicated source-query failure panel. The production query was then restored and rechecked as `LIVE`.

Browser verification of the controlled failure confirmed the exact rendered states: the rail exposed `Live-data query error`, `ERROR`, and `Retry verified source`; Market Decision exposed `ERROR` and `Verified source query failed` with the explicit statement that no market or book values were being substituted. Production read-only query inputs were restored immediately after this check.
