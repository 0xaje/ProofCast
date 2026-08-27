/* Proofcast / Proof Instrument: a judge-facing landing narrative that explains the product before opening the live workspace. */
import { Link } from "wouter";
import { ArrowDownRight, ArrowUpRight, Check, CircleDotDashed, Fingerprint, ScanLine, ShieldCheck, Trophy, GitCompareArrows } from "lucide-react";
import { HeroInstrument } from "@/components/HeroInstrument";
import { CustomConnectButton } from "@/components/CustomConnectButton";

const proofSteps = [
  { number: "01", title: "Observe", detail: "Read the market without confusing its price for your own judgement.", icon: ScanLine },
  { number: "02", title: "Commit", detail: "Record a clear forecast, confidence level, and rationale before the outcome is known.", icon: CircleDotDashed },
  { number: "03", title: "Prove", detail: "Keep the market snapshot, decision, and resolution evidence inspectable together.", icon: Fingerprint },
];

export default function Landing() {
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
          <Link href="/signal">Launch App</Link>
        </div>
        <div className="flex items-center gap-3">
          <CustomConnectButton compact />
          <Link href="/signal" className="pl-nav-cta">
            Launch App <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>

      <main>
        <section className="pl-hero">
          <div className="pl-hero-copy">
            <div className="pl-eyebrow">
              <span /> Prediction intelligence / evidence first
            </div>
            <h1>
              Predictions are cheap.
              <br />
              <em>Proof is not.</em>
            </h1>
            <p className="pl-lead">
              Proofcast turns live Somnia DreamDEX market signals into an accountable, on-chain record of what you
              believed, why you believed it, and what happened after the market resolved.
            </p>
            <div className="pl-actions">
              <Link href="/signal" className="pl-primary">
                Launch App <ArrowUpRight size={18} />
              </Link>
              <a href="#method" className="pl-secondary">
                See the proof loop <ArrowDownRight size={17} />
              </a>
            </div>
            <div className="pl-proofline">
              <span>01</span>
              <p>
                Market signal is not a verdict.
                <br />
                <strong>Your judgement deserves a receipt.</strong>
              </p>
            </div>
          </div>

          <div className="pl-hero-object">
            <HeroInstrument />
          </div>
        </section>

        <section className="pl-ticker" aria-label="Proofcast product principles">
          <span>LIVE MARKET CONTEXT</span>
          <i>✦</i>
          <span>EVENTFORGE AI INTELLIGENCE</span>
          <i>✦</i>
          <span>IMMUTABLE RECEIPT</span>
          <i>✦</i>
          <span>SOMNIA ON-CHAIN ANCHOR</span>
          <i>✦</i>
          <span>BRIER CALIBRATION SCORE</span>
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
              Prediction markets can tell you where a crowd is leaning. They do not preserve your thinking, your
              confidence, or the evidence you acted on. Proofcast provides that missing cryptographic audit trail.
            </p>
          </div>
        </section>

        <section className="pl-loop">
          <div className="pl-loop-heading">
            <div className="pl-section-label">The proof loop / 002</div>
            <h2>
              One decision.
              <br />
              A complete chain of custody.
            </h2>
          </div>
          <div className="pl-step-grid">
            {proofSteps.map(({ number, title, detail, icon: Icon }) => (
              <article key={number} className="pl-step">
                <div className="pl-step-top">
                  <span>{number}</span>
                  <Icon size={21} />
                </div>
                <h3>{title}</h3>
                <p>{detail}</p>
                <div className="pl-step-rule" />
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
    </div>
  );
}

