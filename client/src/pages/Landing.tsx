import { useState } from "react";
import { Link } from "wouter";
import { ArrowDownRight, ArrowUpRight, Check, CircleDotDashed, Coins, Fingerprint, GitCompareArrows, ScanLine, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { HeroInstrument } from "@/components/HeroInstrument";
import { CustomConnectButton } from "@/components/CustomConnectButton";
import { JudgeGuidedTour } from "@/components/JudgeGuidedTour";
import { SomniaFaucetModal } from "@/components/SomniaFaucetModal";

const proofSteps = [
  { number: "01", title: "Observe", detail: "Read live DreamDEX market signals, order book depth, and real-time spreads.", icon: ScanLine },
  { number: "02", title: "Understand", detail: "Examine EventForge deterministic model intelligence and structured thesis arguments.", icon: GitCompareArrows },
  { number: "03", title: "Challenge", detail: "Confront your forecast with counter-theses and explicit invalidating conditions.", icon: CircleDotDashed },
  { number: "04", title: "Commit", detail: "Freeze an immutable SHA-256 Decision Receipt capturing the exact evidence state.", icon: Fingerprint },
  { number: "05", title: "Anchor", detail: "Anchor the decision hash permanently on Somnia Shannon Testnet via ProofCastAnchor.sol.", icon: ShieldCheck },
  { number: "06", title: "Resolve", detail: "Automated, idempotent settlement ingestion as DreamDEX event contracts resolve.", icon: Check },
  { number: "07", title: "Prove", detail: "Calculate verified Brier calibration scores ($BS = (f - o)^2$) and lifetime calibration tiers.", icon: Trophy },
];

export default function Landing() {
  const [tourOpen, setTourOpen] = useState(false);
  const [faucetOpen, setFaucetOpen] = useState(false);

  return (
    <div className="proof-landing">
      <nav className="pl-nav">
        <Link href="/" className="pl-wordmark">
          <span className="pl-seal">↗</span>
          <span>
            proof<span>cast</span>
          </span>
        </Link>
        <div className="pl-nav-links">
          <a href="#method">How It Works</a>
          <button onClick={() => setTourOpen(true)} className="flex items-center gap-1 text-[#c8f06a] hover:underline">
            <Sparkles size={13} /> 45s Tour
          </button>
          <button onClick={() => setFaucetOpen(true)} className="flex items-center gap-1 text-white/80 hover:text-white">
            <Coins size={13} className="text-[#c8f06a]" /> Faucet
          </button>
        </div>
        <div className="flex items-center gap-3">
          <CustomConnectButton />
          <Link href="/signal" className="pl-nav-cta">
            Launch App <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>

      <main>
        <section className="pl-hero">
          <div className="pl-hero-copy">
            <div className="pl-eyebrow">
              <span /> Decision intelligence before commitment · Accountability after resolution
            </div>
            <h1>
              Observe the signal.
              <br />
              Challenge the thesis.
              <br />
              <em>Commit with proof.</em>
            </h1>
            <p className="pl-lead">
              ProofCast is the decision intelligence and accountability layer for Somnia DreamDEX Event Contracts. Challenge your thinking before you commit, anchor your reasoning on-chain, and prove your calibration when reality resolves.
            </p>
            <div className="pl-actions">
              <Link href="/signal" className="pl-primary">
                Launch App <ArrowUpRight size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setTourOpen(true)}
                className="pl-secondary flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={15} className="text-[#c8f06a]" /> Start 45s Judge Tour
              </button>
            </div>
            <div className="pl-proofline">
              <span>01</span>
              <p>
                Market signal is an input, not a verdict.
                <br />
                <strong>Your judgement deserves an immutable receipt.</strong>
              </p>
            </div>
          </div>

          <div className="pl-hero-object">
            <HeroInstrument />
          </div>
        </section>

        <section className="pl-ticker" aria-label="Proofcast product principles">
          <span>OBSERVE SIGNAL</span>
          <i>✦</i>
          <span>EVENTFORGE AI ANALYSIS</span>
          <i>✦</i>
          <span>CHALLENGE THESIS</span>
          <i>✦</i>
          <span>IMMUTABLE SHA-256 RECEIPT</span>
          <i>✦</i>
          <span>SOMNIA L1 ANCHOR</span>
          <i>✦</i>
          <span>BRIER CALIBRATION SCORE</span>
          <i>✦</i>
          <span>PROVEN LIFECYCLE REPLAY</span>
        </section>

        <section id="method" className="pl-statement">
          <div className="pl-section-label">The thesis / 001</div>
          <div>
            <h2>
              A market price is an input.
              <br />
              Your judgement should be <span>an asset.</span>
            </h2>
            <p>
              Prediction markets tell you what the crowd prices. ProofCast helps you decide what you believe, challenges your thinking before you commit, and preserves the decision long enough for reality to judge it.
            </p>
          </div>
        </section>

        <section className="pl-loop">
          <div className="pl-loop-heading">
            <div className="pl-section-label">The 7-Step Lifecycle / 002</div>
            <h2>
              Observe → Understand → Challenge
              <br />
              Commit → Anchor → Resolve → Prove.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-10">
            {proofSteps.map(({ number, title, detail, icon: Icon }) => (
              <article key={number} className="rounded-xl border border-white/15 bg-black/40 p-6 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex items-center justify-between text-[#c8f06a] font-mono text-xs font-bold">
                    <span>{number}</span>
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-white tracking-tight">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#a09e96]">{detail}</p>
                </div>
                <div className="mt-4 w-8 border-t-2 border-[#f04b2f]" />
              </article>
            ))}
          </div>
        </section>

        <section id="signal" className="pl-signal-preview">
          <div className="pl-preview-head">
            <div>
              <div className="pl-section-label">Live signal room / 003</div>
              <h2>Live context, never manufactured certainty.</h2>
            </div>
            <Link href="/signal" className="pl-arrow-button" aria-label="Open Signal Room">
              <ArrowUpRight size={24} />
            </Link>
          </div>
          <div className="pl-preview-grid">
            <div className="pl-preview-market">
              <div className="pl-data-label">Source boundary</div>
              <div className="pl-preview-value">
                DreamDEX
                <br />
                Event Contracts
              </div>
              <div className="pl-status">
                <span className="pl-live-dot" /> VERIFIED SOMNIA MAINNET
              </div>
            </div>
            <div className="pl-preview-copy">
              <h3>We separate three things that are too often mixed together.</h3>
              <ul>
                <li>
                  <Check size={16} /> What the market shows (Live Orderbooks)
                </li>
                <li>
                  <Check size={16} /> What EventForge estimates (Layer A + Layer B)
                </li>
                <li>
                  <Check size={16} /> What you decide & prove on-chain
                </li>
              </ul>
            </div>
            <div className="pl-preview-cta">
              <p>Non-custodial. No fake positions. No substituted data.</p>
              <Link href="/signal">
                Inspect the live workspace <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="pl-receipt">
          <div className="pl-receipt-copy">
            <div className="pl-section-label">The end state / 004</div>
            <h2>
              Your future self should be able to inspect the decision—not just remember the outcome.
            </h2>
            <p>
              Proofcast makes forecasts, market context, and resolution evidence durable enough to review honestly
              later, backed by Somnia on-chain SHA-256 anchors and Brier calibration scores.
            </p>
            <div className="flex gap-4">
              <Link href="/proof" className="pl-secondary dark">
                Explore the proof ledger <ArrowUpRight size={17} />
              </Link>
              <Link href="/leaderboard" className="pl-secondary dark">
                Global Leaderboard <Trophy size={14} className="inline ml-1" />
              </Link>
            </div>
          </div>
          <div className="pl-receipt-card">
            <div className="pl-receipt-meta">DECISION RECEIPT / VERIFIABLE PROOF</div>
            <div className="pl-receipt-row">
              <span>Market reference</span>
              <b>verified Somnia DreamDEX</b>
            </div>
            <div className="pl-receipt-row">
              <span>Your forecast</span>
              <b>immutable commitment</b>
            </div>
            <div className="pl-receipt-row">
              <span>On-Chain Anchor</span>
              <b>Somnia Shannon Testnet</b>
            </div>
            <div className="pl-receipt-row">
              <span>Resolution evidence</span>
              <b>SHA-256 verified settlement</b>
            </div>
            <div className="pl-receipt-stamp">
              <ShieldCheck size={18} /> Cryptographic proof anchored on Somnia.
            </div>
          </div>
        </section>

        <section className="pl-final">
          <p className="pl-section-label">Proofcast / Start with evidence</p>
          <h2>Ready to see what a prediction should leave behind?</h2>
          <div className="flex justify-center gap-4">
            <Link href="/signal" className="pl-primary">
              Launch App <ArrowUpRight size={18} />
            </Link>
            <Link href="/leaderboard" className="pl-primary bg-[#151515] text-[#f8f6ef]">
              View Leaderboard <Trophy size={16} className="inline ml-1" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="pl-footer">
        <div className="pl-wordmark">
          <span className="pl-seal">↗</span>
          <span>
            proof<span>cast</span>
          </span>
        </div>
        <span>Prediction intelligence & cryptographic audit trail on Somnia.</span>
        <span>© 2026 Proofcast</span>
      </footer>

      {/* Interactive Guided Tour Modal */}
      <JudgeGuidedTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Somnia Faucet & Network Modal */}
      <SomniaFaucetModal isOpen={faucetOpen} onClose={() => setFaucetOpen(false)} />
    </div>
  );
}

