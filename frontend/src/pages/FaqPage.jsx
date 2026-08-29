import React from "react";
import Reveal from "../components/Reveal";
import { FAQ_ITEMS } from "../constants/faq";
import Accordion from "../components/marketing/Accordion";
import CTASection from "../components/marketing/CTASection";
import m from "../styles/marketing.module.css";

export default function FaqPage() {
  return (
    <>
      <section className={m.pageHero}>
        <div className={m.container}>
          <Reveal>
            <span className={m.pageHeroEyebrow}>FAQ</span>
          </Reveal>
          <Reveal delay={70}>
            <h1 className={m.pageHeroTitle}>Frequently Asked Questions</h1>
          </Reveal>
          <Reveal delay={130}>
            <p className={m.pageHeroText}>
              What PulseBoard does today, what it is designed to do next, and where the
              boundaries are.
            </p>
          </Reveal>
        </div>
      </section>

      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <Reveal>
            <Accordion items={FAQ_ITEMS} />
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
