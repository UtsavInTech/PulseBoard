import React from "react";
import styles from "./FlowChain.module.css";

/**
 * Horizontal (responsive → vertical) chain of labelled steps joined by arrows.
 *
 * items: [{ label, meta?, accent? }]
 * tone:  "light" | "dark"
 */
export default function FlowChain({ items = [], tone = "light", vertical = false }) {
  const cls = [
    styles.chain,
    tone === "dark" ? styles.dark : "",
    vertical ? styles.vertical : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <div className={`${styles.node} ${item.accent ? styles.nodeAccent : ""}`}>
            {item.meta && <span className={styles.nodeMeta}>{item.meta}</span>}
            <span>{item.label}</span>
          </div>
          {i < items.length - 1 && (
            <span className={styles.arrow} aria-hidden="true">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
