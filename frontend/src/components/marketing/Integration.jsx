import React from "react";
import Reveal from "../Reveal";
import m from "../../styles/marketing.module.css";
import s from "./Integration.module.css";

const PIPELINE = [
  { name: "Your website or app", note: "where your users actually are" },
  { name: "PulseBoard tracking call", note: "you name the events that matter" },
  { name: "Event ingestion", note: "validated, attributed to a user and session" },
  { name: "Event storage", note: "one shared dataset per organization" },
  { name: "Analytics", note: "funnels, journeys, segments, retention" },
  { name: "Role dashboards", note: "Product, Growth, Research, Executive" },
];

const SAMPLE = `// A product view in your catalogue page
pulseboard.track("product_view", {
  product_id: "P123",
  category:   "electronics"
});`;

export default function Integration() {
  return (
    <section className={`${m.section} ${m.sectionLight}`}>
      <div className={m.container}>
        <div className={m.headerBlock}>
          <Reveal>
            <span className={m.eyebrow}>How Integration Works</span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className={m.heading}>From your product to your dashboards</h2>
          </Reveal>
          <Reveal delay={130}>
            <p className={m.lead}>
              A company connects PulseBoard by sending the events it already cares about.
              The same pipeline that powers this demo would carry those real events.
            </p>
          </Reveal>
        </div>

        <div className={s.split}>
          <Reveal className={s.pipeline}>
            {PIPELINE.map((stage, i) => (
              <React.Fragment key={stage.name}>
                <div className={s.stage}>
                  <span className={s.stageIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={s.stageBody}>
                    <span className={s.stageName}>{stage.name}</span>
                    <span className={s.stageNote}>{stage.note}</span>
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <span className={s.arrow} aria-hidden="true">↓</span>
                )}
              </React.Fragment>
            ))}
          </Reveal>

          <div>
            <Reveal delay={90}>
              <div className={s.codeCard}>
                <div className={s.codeHead}>
                  <span className={s.codeDots}>
                    <span className={s.codeDot} />
                    <span className={s.codeDot} />
                    <span className={s.codeDot} />
                  </span>
                  <span className={s.codeLabel}>conceptual — a packaged SDK does not exist yet</span>
                </div>
                <pre className={s.code}>{SAMPLE}</pre>
              </div>
            </Reveal>

            <div className={s.statusRow}>
              <Reveal delay={140} className={s.status}>
                <span className={`${s.statusTag} ${s.tagNow}`}>Today</span>
                <p className={s.statusText}>
                  The demo runs on synthetic seeded events for a fictional marketplace.
                  Every number in the dashboards is computed from that dataset.
                </p>
              </Reveal>
              <Reveal delay={200} className={s.status}>
                <span className={`${s.statusTag} ${s.tagFuture}`}>In production</span>
                <p className={s.statusText}>
                  The same ingestion, storage and analytics path would receive real events
                  from a customer&apos;s application, with no change to the dashboards.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
