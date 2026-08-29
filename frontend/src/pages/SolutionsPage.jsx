import React from "react";
import Reveal from "../components/Reveal";
import CTASection from "../components/marketing/CTASection";
import { CartIcon, LayersIcon, ShieldIcon } from "../components/marketing/Icons";
import m from "../styles/marketing.module.css";
import s from "./SolutionsPage.module.css";

const SOLUTIONS = [
  {
    icon: CartIcon,
    name: "E-Commerce",
    tagline: "Understand every customer journey.",
    body: [
      "Discover what users search for, what they view, where they drop off, and which experiences lead to conversion.",
    ],
    useLabel: "Use cases",
    uses: [
      "Product discovery",
      "Search behavior",
      "Cart abandonment",
      "Feature adoption",
      "Customer segmentation",
    ],
  },
  {
    icon: LayersIcon,
    name: "SaaS & Digital Products",
    tagline: "Build products around real behavior.",
    body: [
      "Understand which features users rely on, which workflows create friction, and how product usage changes over time.",
    ],
    useLabel: "Use cases",
    uses: [
      "Feature adoption",
      "User journeys",
      "Retention analysis",
      "Product optimization",
      "Usage patterns",
    ],
  },
  {
    icon: ShieldIcon,
    name: "Banking & FinTech",
    tagline: "Connect the signals that matter.",
    body: [
      "Financial activity generates multiple signals across transactions, devices, locations, sessions, and account behavior.",
      "PulseBoard's long-term vision is to connect these signals to help identify unusual patterns and support faster investigation.",
    ],
    useLabel: "Potential use cases",
    uses: [
      "Transaction behavior",
      "Device activity",
      "Location changes",
      "Account behavior",
      "Anomaly detection",
      "Risk intelligence",
    ],
    note: "PulseBoard does not currently detect fraud. Behavioral risk detection is part of the long-term vision, and the current event-driven foundation is what makes it possible to build toward.",
  },
];

export default function SolutionsPage() {
  return (
    <>
      <section className={m.pageHero}>
        <div className={m.container}>
          <Reveal>
            <span className={m.pageHeroEyebrow}>Solutions</span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className={m.pageHeroTitle}>Solutions Built Around Real Behavior</h1>
          </Reveal>
          <Reveal delay={130}>
            <p className={m.pageHeroText}>
              Turn continuous product activity into information your teams can use.
            </p>
          </Reveal>
        </div>
      </section>

      <section className={`${m.sectionTight} ${m.sectionLight}`}>
        <div className={m.container}>
          {SOLUTIONS.map((sol, i) => {
            const Icon = sol.icon;
            return (
              <div
                key={sol.name}
                className={`${s.solution} ${i % 2 ? s.reverse : ""}`}
              >
                <Reveal>
                  <span className={s.iconBadge}><Icon /></span>
                  <span className={s.index}>
                    {String(i + 1).padStart(2, "0")} / {String(SOLUTIONS.length).padStart(2, "0")}
                  </span>
                  <h2 className={s.title}>{sol.name}</h2>
                  <p className={s.tagline}>{sol.tagline}</p>
                  {sol.body.map((p) => (
                    <p className={s.text} key={p}>{p}</p>
                  ))}
                  {sol.note && <p className={s.note}>{sol.note}</p>}
                </Reveal>

                <Reveal delay={110} className={s.visual}>
                  <p className={s.useTitle}>{sol.useLabel}</p>
                  <ul className={s.useList}>
                    {sol.uses.map((u) => (
                      <li className={s.useItem} key={u}>
                        <span className={s.useMark} aria-hidden="true">✓</span>
                        {u}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      <CTASection />
    </>
  );
}
