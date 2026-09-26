"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import type { PublicToken, ScoredToken } from "@/lib/tokens";
import { fmtDate, fmtPct, fmtUsd } from "@/lib/format";
import { Robot } from "@/components/Robot";

gsap.registerPlugin(ScrollTrigger);

const BAND = { safe: "#3ddc84", watch: "#f5b83d", risk: "#ff5a4e" } as const;

type Props = {
  /** Free demo tokens with full data, safest first - drives the scroll story. */
  story: ScoredToken[];
  /** First rows of the board as a non-Pro visitor sees them. */
  preview: PublicToken[];
  total: number;
  freeCount: number;
};

export function HomeExperience({ story, preview, total, freeCount }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const hero = story[0];

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync.
    let lenis: Lenis | null = null;
    const tick = (t: number) => lenis?.raf(t * 1000);
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.09, anchors: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      // ---- hero
      gsap.from(q(".hero-line > span"), { yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.08 });
      gsap.from(q(".hero-fade"), { autoAlpha: 0, y: 24, duration: 0.9, delay: 0.35, stagger: 0.1, ease: "power3.out" });
      const heroNum = q(".hero-num")[0] as HTMLElement | undefined;
      if (heroNum && hero) {
        const c = { v: 0 };
        gsap.to(c, {
          v: hero.verdict.score,
          duration: 1.6,
          delay: 0.5,
          ease: "power3.out",
          onUpdate: () => (heroNum.textContent = String(Math.round(c.v))),
        });
      }

      // ---- story: pinned robot, its screen score moves token to token
      if (story.length > 1) {
        const num = q(".story-num")[0] as HTMLElement;
        const counter = q(".story-count")[0] as HTMLElement;
        const state = { v: story[0].verdict.score };
        const render = () => (num.textContent = String(Math.round(state.v)));

        gsap.set(q(".story-step:not([data-i='0']), .story-data:not([data-i='0'])"), { autoAlpha: 0, y: 30 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: q(".story")[0],
            start: "top top",
            end: `+=${story.length * 90}%`,
            pin: true,
            scrub: 0.7,
            onUpdate: (self) => {
              const i = Math.min(story.length - 1, Math.floor(self.progress * story.length));
              counter.textContent = `${String(i + 1).padStart(2, "0")} / ${String(story.length).padStart(2, "0")}`;
            },
          },
        });
        story.forEach((t, i) => {
          if (i === 0) return;
          const at = i - 0.7;
          tl.to(state, { v: t.verdict.score, duration: 1, onUpdate: render }, at)
            .to(q(".story-stage"), { "--band": BAND[t.verdict.band], duration: 1 }, at)
            .to(q(".story-robot"), { rotateY: i % 2 ? -14 : 14, scale: 1 - i * 0.04, duration: 1 }, at)
            .to(q(`[data-i='${i - 1}']`), { autoAlpha: 0, y: -30, duration: 0.35 }, at)
            .to(q(`[data-i='${i}']`), { autoAlpha: 1, y: 0, duration: 0.35 }, at + 0.55);
        });
        tl.to({}, { duration: 0.4 });
      }

      // ---- preview table rows cascade in
      gsap.from(q(".pv-row"), {
        autoAlpha: 0,
        y: 24,
        stagger: 0.06,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: q(".pv")[0], start: "top 75%" },
      });

      // ---- generic reveal
      q("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 40,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    }, root);

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, [hero?.verdict.score, story.length]);

  return (
    <div ref={root} className="home">
      <div className="aurora" aria-hidden />

      {/* ------------------------------------------------------------ hero */}
      <section className="h-hero lines">
        <div className="h-hero-copy">
          <p className="g-mono hero-fade">[ SafeHold ] &nbsp;Unlock risk, in plain English</p>
          <h1 className="h-title">
            <span className="hero-line"><span>Know before</span></span>
            <span className="hero-line"><span className="accent">you hold.</span></span>
          </h1>
          <p className="h-lead hero-fade">
            Token unlocks flood the market with new supply. SafeHold scores {total} tokens from 0 to 100 and
            warns you before the next unlock hits.
          </p>
          <div className="h-actions hero-fade">
            <Link href="/app" className="g-btn g-btn-solid">Open the radar</Link>
            <a href="#story" className="g-btn g-btn-ghost">See how it works</a>
          </div>
        </div>

        {hero && (
          <div className="h-visual hero-fade" style={{ ["--band" as string]: BAND[hero.verdict.band] }}>
            <div className="bob">
              <Robot>
                <span className="robot-num hero-num">0</span>
              </Robot>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ story (pin) */}
      <section id="story" className="story lines">
        <div className="story-stage" style={{ ["--band" as string]: BAND[story[0]?.verdict.band ?? "safe"] }}>
          <div className="story-left">
            <p className="g-mono">
              Watch the score react &nbsp;<span className="story-count">01 / {String(story.length).padStart(2, "0")}</span>
            </p>
            <div className="story-steps">
              {story.map((t, i) => (
                <div key={t.id} className="story-step" data-i={i}>
                  <h2>{t.verdict.headline}</h2>
                  <p>{t.verdict.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="story-center">
            <div className="story-robot">
              <Robot>
                <span className="robot-num story-num">{story[0]?.verdict.score ?? 0}</span>
              </Robot>
            </div>
          </div>

          <div className="story-right">
            {story.map((t, i) => (
              <dl key={t.id} className="story-data g-glass" data-i={i}>
                <div><dt>Token</dt><dd>{t.symbol} <span>{t.name}</span></dd></div>
                <div><dt>Next unlock</dt><dd>{t.nextUnlock ? fmtDate(t.nextUnlock.date) : "None"}</dd></div>
                <div><dt>Days away</dt><dd>{t.nextUnlock ? t.nextUnlock.daysUntil : "—"}</dd></div>
                <div><dt>Of supply</dt><dd>{t.nextUnlock ? fmtPct(t.nextUnlock.pctOfCirculatingBps / 100) : "—"}</dd></div>
              </dl>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- preview (blur) */}
      <section className="h-section lines">
        <p className="g-mono" data-reveal>The radar</p>
        <h2 className="h-h2" data-reveal>
          {total} tokens ranked by unlock risk. {freeCount} free, the rest with Pro.
        </h2>

        <div className="pv g-glass">
          {preview.map((t) => (
            <div key={t.id} className={`pv-row ${t.locked ? "is-locked" : `band-${t.verdict.band}`}`}>
              <span className="c-token">
                <span className="avatar">{t.symbol.slice(0, 3)}</span>
                <span className="c-name">
                  <strong>{t.symbol}</strong>
                  <small>{t.name}</small>
                </span>
              </span>
              <span className="c-score">
                {t.locked ? <span className="blur">88</span> : <span className="score">{t.verdict.score}</span>}
              </span>
              <span className="c-status">
                {t.locked ? <span className="blur">Watch closely</span> : <span className="status-pill">{t.verdict.headline}</span>}
              </span>
              <span className="c-mcap">{fmtUsd(t.marketCap)}</span>
              {t.locked && <span className="lock">PRO</span>}
            </div>
          ))}
          <div className="pv-fade">
            <Link href="/app" className="g-btn g-btn-solid">See all {total} tokens</Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section id="how" className="h-section lines">
        <p className="g-mono" data-reveal>How it works</p>
        <h2 className="h-h2" data-reveal>From raw unlock data to a one-tap decision.</h2>
        <div className="h-grid3">
          {[
            ["01", "Pull the data", "Unlock schedules and supply from Tokenomist, cached once and served to everyone."],
            ["02", "Score it", "An open 0–100 formula weighs how big and how close the next unlock is. Audit it yourself."],
            ["03", "Go Pro on-chain", "Pay in AVAX from your wallet. Your subscription lives on Avalanche, verifiable by anyone."],
          ].map(([n, title, body]) => (
            <div key={n} className="g-glass h-card" data-reveal>
              <span className="g-mono accent">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section id="pricing" className="h-section lines">
        <p className="g-mono" data-reveal>Pricing</p>
        <h2 className="h-h2" data-reveal>Free to look. Pro to see everything.</h2>
        <div className="h-plans">
          <div className="g-glass h-plan" data-reveal>
            <p className="g-mono">Free</p>
            <p className="h-price">$0</p>
            <ul>
              <li>{freeCount} demo tokens with full scores</li>
              <li>Every other token listed, scores hidden</li>
              <li>No wallet needed</li>
            </ul>
            <Link href="/app" className="g-btn g-btn-ghost">Open the radar</Link>
          </div>
          <div className="g-glass h-plan h-plan-pro" data-reveal>
            <p className="g-mono accent">Pro</p>
            <p className="h-price">0.02 AVAX <span>/ 30 days</span></p>
            <ul>
              <li>All {total} tokens with full scores and unlock dates</li>
              <li>Detailed unlock timeline for every token</li>
              <li>Alerts before unlocks on your watchlist</li>
              <li>No auto-renew. Paid and verified on Avalanche.</li>
            </ul>
            <Link href="/app" className="g-btn g-btn-solid">Go Pro</Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="h-cta lines">
        <h2 className="h-cta-title" data-reveal>Don&apos;t get blindsided by the next unlock.</h2>
        <div data-reveal>
          <Link href="/app" className="g-btn g-btn-solid">Open the radar</Link>
        </div>
      </section>

      <footer className="h-footer">
        <span className="brand">SafeHold</span>
        <span className="g-mono">Built on Avalanche · Unlock data from Tokenomist</span>
      </footer>
    </div>
  );
}
