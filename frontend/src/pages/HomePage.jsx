import React from "react";
import Reveal from "../components/Reveal";
import Button from "../components/marketing/Button";
import DashboardPreview from "../components/marketing/DashboardPreview";
import DemoAccounts from "../components/marketing/DemoAccounts";
import FlowChain from "../components/marketing/FlowChain";
import CTASection from "../components/marketing/CTASection";
import Integration from "../components/marketing/Integration";
import Accordion from "../components/marketing/Accordion";
import { FAQ_ITEMS } from "../constants/faq";
import {
  PulseIcon, NetworkIcon, TargetIcon, UsersIcon, AlertIcon, ChartIcon,
} from "../components/marketing/Icons";
import m from "../styles/marketing.module.css";
import s from "./HomePage.module.css";

const BENEFITS = [
  {
    icon: PulseIcon,
    title: "Real-Time Visibility",
    text: "See product activity as it happens and understand what users are doing across your application.",
  },
  {
    icon: NetworkIcon,
    title: "Behavioral Insights",
    text: "Turn raw interaction data into meaningful patterns that reveal how users actually use your product.",
  },
  {
    icon: TargetIcon,
    title: "Product Optimization",
    text: "Identify the features users value, the workflows they abandon, and the areas that need improvement.",
  },
  {
    icon: UsersIcon,
    title: "User Understanding",
    text: "Understand different user segments and discover how behavior changes across demographics and journeys.",
  },
  {
    icon: AlertIcon,
    title: "Early Detection",
    text: "Surface unusual activity and behavioral changes before they become larger problems.",
  },
  {
    icon: ChartIcon,
    title: "Data-Driven Decisions",
    text: "Give product and business teams the information they need to make decisions based on real usage rather than assumptions.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Capture",
    text: "PulseBoard collects meaningful events from your website or application.",
  },
  {
    num: "02",
    title: "Understand",
    text: "Events are organized into users, sessions, journeys, and behavioral patterns.",
  },
  {
    num: "03",
    title: "Analyze",
    text: "PulseBoard identifies trends, frequently used features, drop-offs, and unusual activity.",
  },
  {
    num: "04",
    title: "Act",
    text: "Teams can use these insights to improve products, personalize experiences, and respond to important changes.",
  },
];

const PIPELINE = [
  { label: "Your Product" },
  { label: "User Interactions" },
  { label: "PulseBoard", accent: true },
  { label: "Behavioral Data" },
  { label: "Insights" },
  { label: "Better Decisions" },
];

const VISION_CHAIN = [
  { label: "Events", meta: "Today" },
  { label: "Behavior", meta: "Today" },
  { label: "Patterns", meta: "Next" },
  { label: "Insights", meta: "Next" },
  { label: "Predictions", meta: "Long term" },
  { label: "Action", meta: "Long term", accent: true },
];

export default function HomePage() {
  // Re-clicking the anchor when the hash is already set produces no route
  // change, so scroll explicitly in that case.
  function scrollToHowItWorks() {
    if (window.location.hash !== "#how-it-works") return;
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* ══ Hero ══════════════════════════════════════════════════════ */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div>
            <Reveal>
              <span className={s.heroLabel}>Real-Time Behavioral Intelligence</span>
            </Reveal>
            <Reveal delay={70}>
              <h1 className={s.heroTitle}>
                Understand Every Interaction.
                <span>Turn Behavior Into Insight.</span>
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className={s.heroText}>
                PulseBoard helps businesses understand how users interact with their
                products in real time — turning everyday interactions into meaningful
                insights, patterns, and opportunities.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className={s.heroActions}>
                <Button to="/login" variant="onDark" size="lg" arrow>
                  Explore PulseBoard
                </Button>
                <Button
                  to="/#how-it-works"
                  variant="ghostOnDark"
                  size="lg"
                  onClick={scrollToHowItWorks}
                >
                  See How It Works
                </Button>
              </div>
            </Reveal>
            <Reveal delay={260}>
              <div className={s.heroMeta}>
                <div className={s.metaItem}>
                  <span className={s.metaValue}>Event-driven</span>
                  <span className={s.metaLabel}>Architecture</span>
                </div>
                <div className={s.metaItem}>
                  <span className={s.metaValue}>Interactive</span>
                  <span className={s.metaLabel}>Analytics</span>
                </div>
                <div className={s.metaItem}>
                  <span className={s.metaValue}>Working</span>
                  <span className={s.metaLabel}>Prototype</span>
                </div>
              </div>
            </Reveal>
          </div>

          <div className={s.heroVisual}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ══ Why PulseBoard ════════════════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <div className={s.introSplit}>
            <div>
              <Reveal>
                <span className={m.eyebrow}>Why PulseBoard</span>
              </Reveal>
              <Reveal delay={70}>
                <h2 className={s.introHeading}>
                  Your product generates data every second.
                  <br />
                  <span>PulseBoard helps you understand it.</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={140}>
              <p className={s.introBody}>
                Every click, search, filter, transaction, and interaction can reveal
                something about your users. PulseBoard brings these signals together so
                teams can understand behavior, identify patterns, and make better product
                decisions.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ Benefits ══════════════════════════════════════════════════ */}
      <section className={m.section}>
        <div className={m.container}>
          <div className={`${m.headerBlock} ${m.headerCenter}`}>
            <Reveal>
              <span className={m.eyebrow}>Capabilities</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={`${m.heading} ${m.headingCenter}`}>
                Turn Product Activity Into Useful Intelligence
              </h2>
            </Reveal>
          </div>

          <div className={m.grid3}>
            {BENEFITS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 80} className={m.card}>
                <span className={`${m.cardIcon} ${i % 2 ? m.cardIconTeal : ""}`}>
                  <Icon />
                </span>
                <h3 className={m.cardTitle}>{title}</h3>
                <p className={m.cardText}>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ How it works ══════════════════════════════════════════════ */}
      <section id="how-it-works" className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <div className={m.headerBlock}>
            <Reveal>
              <span className={m.eyebrow}>How It Works</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={m.heading}>From Interaction to Intelligence</h2>
            </Reveal>
          </div>

          <div className={s.steps}>
            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 90} className={s.step}>
                <span className={s.stepNum}>{step.num} —</span>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepText}>{step.text}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120} className={s.flowWrap}>
            <p className={s.flowCaption}>The path a single interaction travels</p>
            <FlowChain items={PIPELINE} />
          </Reveal>
        </div>
      </section>

      {/* ══ Bigger vision ═════════════════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionDark}`}>
        <div className={m.container}>
          <div className={`${m.headerBlock} ${m.headerCenter}`}>
            <Reveal>
              <span className={m.eyebrow}>The Bigger Picture</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={`${m.heading} ${m.headingCenter}`}>
                From Analytics to Intelligence
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className={`${m.lead} ${m.leadCenter}`}>
                Today, PulseBoard helps teams understand what users are doing. Our
                long-term vision is to help organizations understand the patterns behind
                those actions.
              </p>
            </Reveal>
          </div>

          <Reveal delay={80}>
            <FlowChain items={VISION_CHAIN} tone="dark" />
          </Reveal>

          <Reveal delay={140}>
            <p className={s.visionNote}>
              What begins as product analytics can evolve into a broader behavioral
              intelligence platform — helping organizations discover patterns across
              millions of interactions and respond to important changes in real time.
            </p>
          </Reveal>
        </div>
      </section>

      <Integration />

      {/* ══ Demo ══════════════════════════════════════════════════════ */}
      <section id="demo" className={m.section}>
        <div className={m.container}>
          <div className={`${m.headerBlock} ${m.headerCenter}`}>
            <Reveal>
              <span className={m.eyebrow}>Live Demo</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={`${m.heading} ${m.headingCenter}`}>Experience PulseBoard</h2>
            </Reveal>
            <Reveal delay={130}>
              <p className={`${m.lead} ${m.leadCenter}`}>
                Explore the platform using one of our demonstration accounts.
              </p>
            </Reveal>
          </div>

          <Reveal delay={80}>
            <DemoAccounts />
          </Reveal>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════ */}
      <section className={`${m.section} ${m.sectionLight}`}>
        <div className={m.container}>
          <div className={`${m.headerBlock} ${m.headerCenter}`}>
            <Reveal>
              <span className={m.eyebrow}>Questions</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className={`${m.heading} ${m.headingCenter}`}>
                Frequently Asked Questions
              </h2>
            </Reveal>
          </div>

          <Reveal>
            <Accordion items={FAQ_ITEMS.slice(0, 6)} />
          </Reveal>

          <Reveal delay={90}>
            <div className={`${m.actions} ${m.actionsCenter}`}>
              <Button to="/faq" variant="secondary" arrow>
                View all questions
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
