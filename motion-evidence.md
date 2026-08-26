# Proof Instrument Motion Evidence

## Shared interaction coverage

The premium interaction layer is shared across the Proof Instrument interface. It covers Carbon evidence panels, landing and workspace action controls, left-rail navigation, header buttons, proof-loop steps, comparison rows, counter-thesis cards, receipt prerequisites, evidence-lane cards, and score cells.

On devices with a fine pointer, evidence surfaces lift **4px** and receive a low-opacity Signal Vermilion material wash. Carbon proof-loop surfaces substitute an Acid Chartreuse border emphasis. Primary actions lift **3px**, move their directional icon, and acknowledge press with a **0.97** scale. Navigation items shift subtly along their intended direction.

Keyboard-focusable controls receive an Acid Chartreuse focus outline. Hover-only behavior is restricted to `@media (hover:hover) and (pointer:fine)`. The project-wide `prefers-reduced-motion: reduce` rule disables nonessential animation and transition timing, while the fresh mobile route review confirmed no hover behavior affects the compact layouts.
