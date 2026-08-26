# Local environment configuration template

This document is the public, non-secret configuration template for ProofCast. It replaces a committed `.env.example` file because this project’s environment values are managed through a secure configuration system. It documents **names, purposes, and safe local defaults** only; it must never be used to share production credentials, wallet keys, seed phrases, or database passwords.

> The current DreamDEX integration is **read-only**. It uses public Event Contract infrastructure and does not need a private key, a signer, a funded wallet, or a transaction-execution credential.

## When local configuration is needed

For the current public Signal Room and Market Decision experience, a normal local install can generally run with the managed platform configuration. If you are running a standalone local server, creating authenticated flows, or adding persistence, create a local `.env` file and set only the variables required for your setup. Do not commit it.

| Variable | Required for the current read-only demo | Purpose | Safe local guidance |
|---|---:|---|---|
| `NODE_ENV` | No | Selects development or production runtime behavior | Use `development` while working locally. |
| `PORT` | No | Lets the server bind to a preferred local port | Use `3000` or leave unset for the runtime default. |
| `JWT_SECRET` | Only for a self-hosted authenticated flow | Signs session data | Generate a long, unique local value; never reuse a published example. |
| `DATABASE_URL` | No | Connects the persistence layer for future forecasts and Decision Receipts | Leave unset for the read-only demo, or use a local non-production MySQL/TiDB connection. |
| `VITE_APP_ID` | Only for Manus OAuth | Identifies the OAuth application in the browser | Obtain it from the relevant OAuth application settings. |
| `OAUTH_SERVER_URL` | Only for Manus OAuth | Server-side OAuth endpoint | Use the matching OAuth provider URL. |
| `VITE_OAUTH_PORTAL_URL` | Only for Manus OAuth | Browser redirect destination for login | Use the matching OAuth portal URL. |
| `OWNER_OPEN_ID` | Only for owner-scoped platform features | Identifies the project owner for platform services | Do not publish a personal production identifier. |
| `BUILT_IN_FORGE_API_URL` | No | Hosted platform service endpoint | Leave unset in an ordinary public clone. |
| `BUILT_IN_FORGE_API_KEY` | No | Hosted platform service token | Keep in the secure configuration system only. |
| `VITE_FRONTEND_FORGE_API_URL` | No | Browser-side hosted service endpoint | Leave unset in an ordinary public clone. |
| `VITE_FRONTEND_FORGE_API_KEY` | No | Browser-side hosted service token | Keep in the secure configuration system only. |

## Safe standalone workflow

Begin with the smallest viable configuration. For a read-only local product walkthrough, install dependencies and start the application without introducing secrets:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

When a feature genuinely requires a local variable, create `.env` manually, add only the specific variable from the table above, and restart the development server. A local authentication or persistence feature should fail clearly when its required value is absent; it should not be worked around by committing credentials.

## Explicitly prohibited values

Never place any of the following in source control, issue comments, pull requests, demos, screenshots, or documentation:

| Category | Examples |
|---|---|
| Wallet secrets | Private key, recovery phrase, signing key, hardware-wallet export |
| Financial access | Exchange API secret, trading authorization, payment credential |
| Production access | Database password, session secret, OAuth client secret, deployment token |
| Personal data | User records, account balances, personally identifying support exports |

The repository’s [`.gitignore`](../.gitignore) excludes `.env` files. If a secret is exposed, revoke or rotate it immediately and remove it from all accessible logs and workflows according to the relevant provider’s incident-response process.
