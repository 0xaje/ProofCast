# DreamDEX Signal Room Validation Evidence

## Controlled query-failure browser inspection

**Path inspected:** `/market` on the local Proofcast development application.

To verify the failure path, the public snapshot query was temporarily given an invalid `limit: 0` input. The browser rendered the following observable states:

- The persistent rail displayed **“Live-data query error”** and an **“ERROR”** status chip.
- The rail supplied the recovery action **“Retry verified source.”**
- The Market Decision route displayed the **“ERROR”** state and the heading **“Verified source query failed.”**
- The route explained: **“no market or book values are being substituted.”**

The production query configuration was restored immediately after this validation. The local public `dreamdex.snapshot` procedure was rechecked as **`LIVE`** against the official mainnet source.
