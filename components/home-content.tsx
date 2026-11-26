"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Eye,
  Pause,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { RecordedDemo } from "@/components/recorded-demo";
import { Reveal } from "@/components/reveal";
import { LangToggle, useCopy } from "@/components/lang-provider";
import { PageTitle } from "@/components/page-title";

export function HomeContent() {
  const c = useCopy();
  return (
    <main className="landing">
      <PageTitle
        zh="续语传心 — 为你说不出口的那句话"
        en="Xuyu — A voice for what you mean"
      />
      <a href="#experience" className="skip-link">
        {c.nav.skipToExperience}
      </a>
      <header className="site-nav">
        <Brand />
        <nav aria-label={c.nav.mainNav}>
          <a href="#experience">{c.nav.experience}</a>
          <a href="#how-it-works">{c.nav.madeForYou}</a>
          <a href="https://github.com/le3334515-tech/xuyu-chuanxin">
            {c.nav.source} <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="site-nav-actions">
          <LangToggle className="icon-button lang-button" />
          <Link className="button primary" href="/speak">
            {c.nav.startSpeaking} <ArrowUpRight size={17} />
          </Link>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="award-note">
            <Sparkles size={15} /> {c.home.award}
          </div>
          <h1>
            {c.home.heroLine1}
            <br />
            <span>{c.home.heroLine2}</span>
          </h1>
        </div>
        <div className="hero-aside">
          <p>
            {c.home.heroP1}
            <br />
            {c.home.heroP2}
          </p>
          <Link className="button primary hero-cta" href="/speak">
            {c.home.heroCta} <ArrowRight size={20} />
          </Link>
          <span className="hero-footnote">
            <Check size={14} /> {c.home.heroFootnote}
          </span>
        </div>
      </section>
      <section
        className="experience-stage"
        id="experience"
        aria-label={c.demo.chaptersLabel}
      >
        <RecordedDemo />
      </section>
      <div className="principle-strip">
        <p>
          {c.home.principle} <strong>{c.home.principleStrong}</strong>
        </p>
        <span>
          <Volume2 size={18} /> {c.home.poweredBy}
        </span>
        <span>
          {c.home.adaptedFrom} <ArrowUpRight size={15} />
        </span>
      </div>
      <Reveal className="editorial-section">
        <section id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">{c.home.editorialEyebrow}</span>
            <h2>
              {c.home.editorialH2a}
              <br />
              <span>{c.home.editorialH2b}</span>
            </h2>
            <p>{c.home.editorialP}</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card compose-feature">
              <div className="feature-top">
                <span className="feature-icon">
                  <Volume2 size={23} />
                </span>
                <span>{c.home.f1Index}</span>
              </div>
              <h3>
                {c.home.f1H3a}
                <br />
                {c.home.f1H3b}
              </h3>
              <p>{c.home.f1P}</p>
              <div className="mini-composer" aria-hidden="true">
                <span>
                  {c.home.f1Sample}
                  <span className="static-caret" />。
                </span>
                <div>
                  <span>{c.home.f1Caption}</span>
                  <Volume2 size={17} />
                </div>
              </div>
            </article>
            <article className="feature-card pause-feature">
              <div className="feature-top">
                <span className="feature-icon">
                  <Pause size={23} />
                </span>
                <span>{c.home.f2Index}</span>
              </div>
              <h3>
                {c.home.f2H3a}
                <br />
                {c.home.f2H3b}
              </h3>
              <p>{c.home.f2P}</p>
              <div className="mini-revision" aria-hidden="true">
                <span className="revision-old">{c.home.f2Old}</span>
                <ArrowRight size={16} />
                <strong>{c.home.f2New}</strong>
              </div>
            </article>
            <article className="feature-card show-feature">
              <div className="feature-top">
                <span className="feature-icon">
                  <Eye size={23} />
                </span>
                <span>{c.home.f3Index}</span>
              </div>
              <h3>
                {c.home.f3H3a}
                <br />
                {c.home.f3H3b}
              </h3>
              <p>{c.home.f3P}</p>
              <div className="mini-listener" aria-hidden="true">
                <span>{c.home.f3Tag}</span>
                <strong>
                  {c.home.f3StrongA}
                  <br />
                  {c.home.f3StrongB}
                </strong>
                <span>{c.brand.name}</span>
              </div>
            </article>
          </div>
        </section>
      </Reveal>
      <Reveal className="everyday-section">
        <div className="everyday-copy">
          <span className="eyebrow">{c.home.everydayEyebrow}</span>
          <h2>
            {c.home.everydayH2a}
            <br />
            <span>{c.home.everydayH2b}</span>
          </h2>
          <p>{c.home.everydayP}</p>
          <Link className="quiet-link" href="/speak">
            {c.home.everydayLink} <ArrowRight size={18} />
          </Link>
          <div className="everyday-checks">
            <span>
              <Check size={16} /> {c.home.check1}
            </span>
            <span>
              <Check size={16} /> {c.home.check2}
            </span>
            <span>
              <Check size={16} /> {c.home.check3}
            </span>
          </div>
        </div>
        <div className="phrase-preview">
          <div className="phrase-preview-heading">
            <span className="feature-icon">
              <Bookmark size={21} />
            </span>
            <div>
              <strong>{c.home.libraryTitle}</strong>
              <span>{c.home.librarySub}</span>
            </div>
          </div>
          <Link href="/speak?starter=more-time">
            <span className="phrase-letter lavender">Aa</span>
            <span>{c.starters[0]}</span>
            <ArrowUpRight size={20} />
          </Link>
          <Link href="/speak?starter=ask-me">
            <span className="phrase-letter peach">Aa</span>
            <span>{c.starters[1]}</span>
            <ArrowUpRight size={20} />
          </Link>
          <Link href="/speak?starter=try-again">
            <span className="phrase-letter green">Aa</span>
            <span>{c.starters[2]}</span>
            <ArrowUpRight size={20} />
          </Link>
          <p>
            <ShieldCheck size={15} /> {c.home.librarySavedNote}
          </p>
        </div>
      </Reveal>
      <Reveal className="trust-section">
        <div className="trust-heading">
          <ShieldCheck size={28} />
          <h2>
            {c.home.trustH2a}
            <br />
            <span>{c.home.trustH2b}</span>
          </h2>
        </div>
        <div>
          <p>{c.home.trustP}</p>
          <p className="small-print">{c.home.trustSmall}</p>
        </div>
      </Reveal>
      <section className="closing-section">
        <span className="eyebrow">{c.home.closingEyebrow}</span>
        <h2>
          {c.home.closingH2a}
          <br />
          <span>{c.home.closingH2b}</span>
        </h2>
        <Link className="button primary" href="/speak">
          {c.home.closingCta} <ArrowRight size={20} />
        </Link>
        <div className="closing-wave" aria-hidden="true">
          {Array.from({ length: 19 }, (_, i) => (
            <i
              key={i}
              style={{
                height: `${Math.round(25 + Math.sin(i / 2) ** 2 * 95)}px`,
              }}
            />
          ))}
        </div>
      </section>
      <footer className="site-footer">
        <Brand />
        <span>{c.home.adaptedFrom} · {c.home.footerNote}</span>
        <a href="https://github.com/le3334515-tech/xuyu-chuanxin">
          {c.home.footerCode} <ArrowUpRight size={16} />
        </a>
      </footer>
    </main>
  );
}
