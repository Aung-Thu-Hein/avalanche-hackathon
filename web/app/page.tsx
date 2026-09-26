import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ScoreRing } from "@/components/Visuals";
import { fmtDate, fmtPct } from "@/lib/format";
import { allTokens, findToken } from "@/lib/tokens";

// Scores and "days until" depend on today's date - render per request.
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "One trusted place",
    body: "Vesting schedules are scattered across blog posts, PDFs and Discord. We pull them into one view.",
  },
  {
    title: "Plain English",
    body: "No FDV or cliff jargon. A 0–100 score and one sentence that tells you what it means for you.",
  },
  {
    title: "Warned in time",
    body: "By the time an unlock is news, the price has moved. Pro alerts you before it happens.",
  },
];

const STEPS = [
  { n: "1", title: "Search a token", body: "Type a symbol like AVAX. No account, no wallet needed." },
  { n: "2", title: "Read the score", body: "See the safety score, the next unlock date and how much supply it adds." },
  { n: "3", title: "Go Pro", body: "Pay 0.05 AVAX from your wallet. Your subscription is recorded on Avalanche." },
];

export default function Home() {
  const hero = findToken("AVAX");
  const tokens = allTokens();

  return (
    <>
      <Navbar variant="home" />

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="badge">Built on Avalanche</span>
              <h1 className="hero-title">Know before you hold.</h1>
              <p className="hero-sub">
                Token unlocks add new supply and move prices. SafeHold gives every token a simple
                safety score and warns you before the next unlock.
              </p>
              <div className="hero-actions">
                <Link href="/app" className="btn btn-primary btn-lg">Check a token</Link>
                <a href="#how" className="btn btn-secondary btn-lg">How it works</a>
              </div>
              <p className="small muted">Free to use. No sign-up required.</p>
            </div>

            {hero && (
              <div className={`card preview band-${hero.verdict.band}`}>
                <div className="result-top">
                  <ScoreRing score={hero.verdict.score} />
                  <div className="result-text">
                    <p className="result-sym">
                      {hero.symbol} <span>{hero.name}</span>
                    </p>
                    <p className={`status status-${hero.verdict.band}`}>{hero.verdict.headline}</p>
                    <p className="muted">{hero.verdict.detail}</p>
                  </div>
                </div>
                <div className="facts">
                  <div>
                    <span>Next unlock</span>
                    <strong>{hero.nextUnlock ? fmtDate(hero.nextUnlock.date) : "None scheduled"}</strong>
                  </div>
                  <div>
                    <span>Size</span>
                    <strong>
                      {hero.nextUnlock ? `${fmtPct(hero.nextUnlock.pctOfCirculatingBps / 100)} of supply` : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------------------------------- features */}
        <section id="features" className="section">
          <div className="container">
            <p className="eyebrow">Why SafeHold</p>
            <h2 className="section-title">Unlocks shouldn&apos;t catch you by surprise</h2>
            <div className="grid-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="card feature">
                  <h3>{f.title}</h3>
                  <p className="muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ live table */}
        <section className="section section-soft">
          <div className="container">
            <p className="eyebrow">Live scores</p>
            <h2 className="section-title">Today&apos;s tokens</h2>
            <div className="card table">
              <div className="table-row table-head">
                <span>Token</span>
                <span>Score</span>
                <span>Status</span>
                <span>Next unlock</span>
              </div>
              {tokens.map((t) => (
                <Link key={t.id} href="/app" className="table-row">
                  <span>
                    <strong>{t.symbol}</strong> <span className="muted">{t.name}</span>
                  </span>
                  <span className={`score-num score-${t.verdict.band}`}>{t.verdict.score}</span>
                  <span className={`pill pill-${t.verdict.band}`}>{t.verdict.headline}</span>
                  <span className="muted">
                    {t.nextUnlock
                      ? `${fmtDate(t.nextUnlock.date)} · ${fmtPct(t.nextUnlock.pctOfCirculatingBps / 100)}`
                      : "None scheduled"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- how it works */}
        <section id="how" className="section">
          <div className="container">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title">Three steps, under a minute</h2>
            <div className="grid-3">
              {STEPS.map((s) => (
                <div key={s.n} className="step">
                  <span className="step-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- pricing */}
        <section id="pricing" className="section section-soft">
          <div className="container">
            <p className="eyebrow">Pricing</p>
            <h2 className="section-title">Simple pricing</h2>
            <div className="grid-2">
              <div className="card plan">
                <h3>Free</h3>
                <p className="price">$0</p>
                <ul className="checklist">
                  <li>Curated token list</li>
                  <li>Daily safety score</li>
                  <li>Plain-English verdict</li>
                </ul>
                <Link href="/app" className="btn btn-secondary btn-block">Start free</Link>
              </div>
              <div className="card plan plan-pro">
                <h3>Pro</h3>
                <p className="price">
                  0.05 AVAX <span>/ 30 days</span>
                </p>
                <ul className="checklist">
                  <li>Alerts before every unlock on your watchlist</li>
                  <li>Full watchlist and faster refresh</li>
                  <li>No auto-renew, paid on Avalanche</li>
                </ul>
                <Link href="/app" className="btn btn-primary btn-block">Go Pro</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="cta">
          <div className="container cta-inner">
            <h2>Check your tokens before the next unlock.</h2>
            <Link href="/app" className="btn btn-light btn-lg">Launch App</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="brand">SafeHold</span>
          <span className="small muted">Built on Avalanche · Unlock data from Tokenomist</span>
        </div>
      </footer>
    </>
  );
}
