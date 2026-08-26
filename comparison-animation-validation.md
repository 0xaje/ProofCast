# Source-Aware Comparison Animation

The Market, EventForge, and You comparison bars now use a `width` transition only in the `prefers-reduced-motion: no-preference` environment. They do not replay merely because the component renders.

The **Market** bar receives a new width only when a verified DreamDEX snapshot changes the displayed midpoint or last-price value. The **EventForge** bar remains at zero and still until a real model value is connected; when one is supplied, it will transition from its prior displayed value. The **You** bar receives a new width only after the user changes the local forecast control.

The initial static bar width remains unanimated, and zero-width unavailable states are explicitly immediate. The shared reduced-motion rule continues to suppress transition timing for users who request it. Tests, typecheck, and production build passed after the refinement.
