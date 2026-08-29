import React from "react";
import Reveal from "../components/Reveal";
import Button from "../components/marketing/Button";
import CTASection from "../components/marketing/CTASection";
import {
  CodeIcon, DatabaseIcon, GridIcon, SparkIcon,
} from "../components/marketing/Icons";
import m from "../styles/marketing.module.css";
import s from "./CareersPage.module.css";

const EXPLORING = [
  {
    icon: CodeIcon,
    title: "Product Engineering",
    text: "Building reliable systems that process and present real-world product activity.",
  },
  {
    icon: DatabaseIcon,
    title: "Data & Analytics",
    text: "Turning raw events into patterns, trends, and useful insights.",
  },
  {
    icon: GridIcon,
    title: "Distributed Systems",
    text: "Exploring architectures capable of processing large volumes of events in real time.",
  },
  {
    icon: SparkIcon,
    title: "Intelligent Systems",
    text: "Exploring anomaly detection, behavioral modeling, and predictive insights.",
  },
];

const AREAS = [
  "Real-time systems",
  "Data engineering",
  "Backend architecture",
  "Analytics",
  "Security",
  "Machine learning",
  "Product engineering",
];

export default function CareersPage() {
  return (
    <>
      <section className={m.pageHero}>
        <div className={m.container}>
          <Reveal>
            <span className={m.pageHeroEyebrow}>Build With Us</span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className={m.pageHeroTitle}>
              We're Building the Intelligence Layer for Digital Products.
            </h1>
          </Reveal>
          <Reveal delay={130}>
            <p className={m.pageHeroText}>
              PulseBoard is an evolving product built around a simple question: what can we
              understand when we stop looking at events individually and start looking at
              behavior as a whole?
            </p>
          </Reveal>
          <Reveal delay={190}>
            <div className={m.actions}>
              <Button to="/login" variant="onDark" size="lg">Explore PulseBoard</Button>
              <Button to="/contact" variant="ghostOnDark" size="lg">Get in Touch</Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Who we are ════════════════════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <div className={s.whoSplit}>
            <div>
              <Reveal>
                <span className={m.eyebrow}>Who We Are</span>
              </Reveal>
              <Reveal delay={70}>
                <h2 className={m.heading}>A product at the intersection of disciplines.</h2>
              </Reveal>
            </div>
            <div>
              <Reveal delay={120}>
                <p className={s.whoText}>
                  We're building a product at the intersection of software engineering,
                  data, analytics, and intelligent systems.
                </p>
              </Reveal>
              <Reveal delay={180}>
                <p className={s.whoText}>
                  Our goal is to turn complex streams of digital activity into information
                  that people can actually use.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══ What we're exploring ══════════════════════════════════════ */}
      <section className={m.section}>
        <div className={m.container}>
          <div className={m.headerBlock}>
            <Reveal>
              <span className={m.eyebrow}>What We're Exploring</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={m.heading}>The problems we spend our time on</h2>
            </Reveal>
          </div>

          <div className={m.grid4}>
            {EXPLORING.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 90} className={s.exploreCard}>
                <span className={s.exploreIcon}><Icon /></span>
                <h3 className={s.exploreTitle}>{title}</h3>
                <p className={s.exploreText}>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Why build with PulseBoard ═════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionDark}`}>
        <div className={m.container}>
          <div className={s.whySplit}>
            <div>
              <Reveal>
                <span className={m.eyebrow}>Why Build With PulseBoard?</span>
              </Reveal>
              <Reveal delay={70}>
                <h2 className={s.whyHeading}>
                  Work on Problems That Scale Beyond the Dashboard.
                </h2>
              </Reveal>
              <Reveal delay={130}>
                <p className={s.whyText}>
                  PulseBoard starts with product analytics, but the underlying problem is
                  much larger: understanding behavior at scale.
                </p>
              </Reveal>
            </div>

            <div>
              <Reveal>
                <p className={s.areaLabel}>Technology & problem areas</p>
              </Reveal>
              <div className={s.areaGrid}>
                {AREAS.map((area, i) => (
                  <Reveal key={area} delay={i * 70} className={s.area}>
                    <span className={s.areaDot} aria-hidden="true" />
                    {area}
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Closing CTA ═══════════════════════════════════════════════ */}
      <section className={m.section}>
        <div className={m.container}>
          <div className={`${m.headerBlock} ${m.headerCenter}`} style={{ marginBottom: 0 }}>
            <Reveal>
              <h2 className={`${m.heading} ${m.headingCenter}`}>
                Interested in Building Something From the Ground Up?
              </h2>
            </Reveal>
            <Reveal delay={90}>
              <p className={`${m.lead} ${m.leadCenter}`}>
                PulseBoard is an evolving project, and we're always interested in
                connecting with people who enjoy solving difficult engineering problems.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className={`${m.actions} ${m.actionsCenter}`}>
                <Button to="/contact" variant="primary" size="lg" arrow>
                  Let's Connect
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
