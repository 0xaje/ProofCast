# Proofcast Design Direction

## Three stylistic approaches

### Theme Name: Signal Room
Very Brief Intro: A dark, editorial intelligence console that treats probabilities, provenance, and risk like instruments in a mission-control room. Calm hierarchy, luminous data accents, and a strong sense of evidence.
Probability: 0.07

### Theme Name: Ledger Light
Very Brief Intro: A bright, paper-and-ink research workspace where every number reads like an annotated record. Warm neutrals, restrained color, and visible timestamps make the product feel accountable rather than speculative.
Probability: 0.04

### Theme Name: Market Tectonics
Very Brief Intro: A bold, high-contrast exchange interface built around shifting layers, contour lines, and directional pressure. It feels fast and analytical without becoming casino-like.
Probability: 0.09

## Chosen approach: Signal Room

### Design Movement
Contemporary information design with references to editorial financial terminals, observability consoles, and Swiss modernism. Proofcast should feel like a place where a careful operator makes a decision from evidence.

### Core Principles
1. Evidence before action: the interface reveals event, probability, model estimate, quality, and rationale before the trade action.
2. Calm intensity: a nearly-black canvas and restrained signal colors create focus without neon spectacle or casino energy.
3. Provenance in the open: every important number has a visible source, freshness state, or snapshot timestamp.
4. One complete loop: Command Center, Market Decision, Forecast, and Proof are connected in one continuous narrative.

### Color Philosophy
The foundation is graphite-black and deep slate, chosen to reduce visual noise and give numeric changes a stable stage. A single ownable signal color—citrine chartreuse—marks verified data, positive movement, and primary actions. Cool cobalt identifies model reference information, while amber is reserved for watch states and red for hard safety failures. Color indicates semantic state, never decoration.

### Layout Paradigm
Use a persistent left rail for orientation and an asymmetric command surface: a wide primary analysis column paired with a narrower evidence column. Avoid centered marketing-card repetition. Let the selected market dominate the viewport, with supporting cards behaving like instrument panels around it.

### Signature Elements
1. A vertical signal rail with a small Proofcast mark, section labels, and live connection state.
2. Provenance chips that pair every key metric with LIVE, SNAPSHOT, or UNAVAILABLE states.
3. A probability comparison band where Market, EventForge, and You are visually distinct but directly comparable.

### Interaction Philosophy
Interactions should clarify commitment. Selecting a market updates the entire decision surface. Forecast submission is explicit and reversible before confirmation. Trade controls are visually subordinate until the user has reviewed model, quality, and execution conditions. When live data is unavailable, affected actions stay disabled and the reason is stated plainly.

### Animation
Use short 160–240ms ease-out transitions for rail selection, market switching, panel reveal, and button feedback. Animate only opacity and transform. Use a quiet pulse for the live connection dot, but never animate financial values as if they were real-time when data is stale. Respect prefers-reduced-motion.

### Typography System
Use Space Grotesk for headings, labels, and numeric display because its geometric forms feel engineered and distinct. Use IBM Plex Sans for body copy, table text, and explanations for high legibility. Use tabular numerals for probabilities, prices, and timestamps. Headline hierarchy should be tight and left-aligned; labels should be uppercase with deliberate tracking.

### Brand Essence
Proofcast is accountable forecasting and trading intelligence for people who want to turn market beliefs into inspectable decisions. Personality: forensic, composed, exacting.

### Brand Voice
Headlines are concise and evidence-led. CTAs describe the next accountable action rather than promising upside. Microcopy names uncertainty directly.

Example lines:
- "See what the market believes before you decide what you believe."
- "Your forecast is a record. Make it specific."

### Wordmark & Logo
The mark is a compact proof seal: a split circle crossed by a vertical check line, suggesting both a market probability ring and a verified record. The wordmark uses a custom-drawn angular P with a cut-through counter, not a default text logo.

### Signature Brand Color
Citrine Signal — #D7F36B. It is bright enough to read on graphite, distinctive from common fintech blues, and emotionally communicates verified attention rather than hype.

## Product scope carried forward from the starter

The first frontend delivery focuses on the four primary views expressed as one coherent experience: Command Center, Market Decision, Forecast, and Proof Profile / Decision Receipt. Integration-aware surfaces are included without fabricating live data: connection state, live/stale/unavailable labels, market quality states, marketId provenance, order-book visibility, forecast-versus-trade separation, and a decision receipt preview. DreamDEX execution controls are clearly marked as unavailable until a real integration is connected.

The interface uses representative static snapshots only as clearly labeled demo content for layout exploration; it does not claim that these are live markets, prices, transactions, or user results.

## Style Decisions

- Every route, including 404 and empty/error states, inherits the Signal Room shell: graphite background, Proofcast mark, restrained semantic color, and operational status language.
- The Proofcast proof-seal mark and angular wordmark appear in the primary orientation area on every page.
- Error-state copy uses accountable system status language, such as: “No decision record exists for this path.”
- The rail, proof seal, wordmark, workspace orientation, and snapshot state are mandatory on every product route before page-specific content.
- Every primary view uses an operator-surface layout with a dominant analysis area and a narrower evidence or status instrument where the content permits.
- Market / EventForge / You probability bands are recurring Proofcast instruments in the Command Center, Market Decision, and Decision Receipt.
