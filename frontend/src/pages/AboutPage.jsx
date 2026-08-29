import React from "react";
import Reveal from "../components/Reveal";
import CTASection from "../components/marketing/CTASection";
import m from "../styles/marketing.module.css";
import s from "./AboutPage.module.css";

const PILLARS = [
  {
    num: "01",
    title: "Observe",
    text: "Capture meaningful interactions across the digital experience.",
  },
  {
    num: "02",
    title: "Understand",
    text: "Organize activity into patterns, journeys, and behavioral signals.",
  },
  {
    num: "03",
    title: "Improve",
    text: "Turn those signals into decisions that improve products and user experiences.",
  },
];

const STAGES = [
  {
    tag: "Today",
    tagClass: "tagToday",
    items: ["Event Tracking", "Analytics", "User Behavior", "Interactive Dashboards"],
  },
  {
    tag: "Next",
    tagClass: "tagNext",
    modifier: "stageNext",
    items: ["Real-Time Streams", "User Journeys", "Funnels", "Segments", "Alerts"],
  },
  {
    tag: "Long Term",
    tagClass: "tagLong",
    modifier: "stageLong",
    items: [
      "Behavioral Intelligence",
      "Anomaly Detection",
      "Risk Intelligence",
      "Predictive Insights",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <section className={m.pageHero}>
        <div className={m.container}>
          <Reveal>
            <span className={m.pageHeroEyebrow}>About PulseBoard</span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className={m.pageHeroTitle}>
              Building a Better Way to Understand Digital Behavior
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ══ Narrative ═════════════════════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <Reveal className={s.narrative}>
            <p>
              Modern products generate enormous amounts of interaction data every day.
              Yet much of that data remains disconnected, difficult to interpret, or only
              analyzed after the fact.
            </p>
            <p>
              PulseBoard was created around a simple idea: businesses should be able to
              understand what is happening inside their products while it is happening.
            </p>
            <p>
              We are building PulseBoard as a behavioral intelligence platform that
              transforms raw interactions into useful information for product, growth,
              security, and business teams.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ Pillars ═══════════════════════════════════════════════════ */}
      <section className={m.section}>
        <div className={m.container}>
          <div className={m.headerBlock}>
            <Reveal>
              <span className={m.eyebrow}>Our Approach</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={m.heading}>Start With Data. Build Toward Intelligence.</h2>
            </Reveal>
          </div>

          <div className={m.grid3}>
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90} className={s.pillar}>
                <span className={s.pillarNum}>{p.num}</span>
                <h3 className={s.pillarTitle}>{p.title}</h3>
                <p className={s.pillarText}>{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Where we are today ════════════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <div className={m.headerBlock}>
            <Reveal>
              <span className={m.eyebrow}>Current Stage</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={m.heading}>Where PulseBoard Is Today</h2>
            </Reveal>
            <Reveal delay={130}>
              <p className={m.lead}>
                PulseBoard is currently being developed as a working prototype focused on
                real-time product analytics, event tracking, user behavior visualization,
                and interactive insights. The current platform establishes the foundation
                for a larger behavioral intelligence system.
              </p>
            </Reveal>
          </div>

          <div className={s.stages}>
            {STAGES.map((stage, i) => (
              <Reveal
                key={stage.tag}
                delay={i * 110}
                className={`${s.stage} ${stage.modifier ? s[stage.modifier] : ""}`}
              >
                <span className={`${s.stageTag} ${s[stage.tagClass]}`}>{stage.tag}</span>
                <ul className={s.stageList}>
                  {stage.items.map((item) => (
                    <li className={s.stageItem} key={item}>
                      <span className={s.stageDot} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          <Reveal delay={80}>
            <p className={s.currentNote}>
              Each stage builds on the one before it. The event tracking and analytics
              working today are what make journeys, funnels, and — eventually — anomaly
              and risk intelligence possible to build.
            </p>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
