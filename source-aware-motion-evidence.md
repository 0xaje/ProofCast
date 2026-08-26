# Source-Aware Comparison Motion Evidence

The Market Decision comparison bars now use explicit update keys instead of a generic transition.

| Bar | Trigger condition | Does not animate when |
|---|---|---|
| Market | A newer verified DreamDEX `asOf` snapshot changes the visible market midpoint or last price. | Initial render, source timestamp alone, or unchanged displayed value. |
| EventForge | A future sourced model value is supplied in a newer verified snapshot and changes the visible model value. | No model is connected, initial render, or unchanged displayed value. |
| You | The local forecast input revision changes and changes the forecast value. | Snapshot refreshes, side selection alone, initial render, or unchanged forecast value. |

The gated decision logic is covered by three passing server test cases alongside the existing suite. The CSS motion class is only attached after an approved trigger and still respects `prefers-reduced-motion`.
