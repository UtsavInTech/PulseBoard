import React, { useState } from "react";
import styles from "./Accordion.module.css";

/**
 * Accessible single-open accordion with a height-animated panel
 * (grid-template-rows 0fr → 1fr keeps the transition smooth without JS).
 *
 * items: [{ q, a }]
 */
export default function Accordion({ items = [], defaultOpen = 0 }) {
  const [openIndex, setOpenIndex] = useState(defaultOpen);

  return (
    <div className={styles.list}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className={`${styles.item} ${isOpen ? styles.open : ""}`}>
            <h3>
              <button
                type="button"
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
              >
                <span>{item.q}</span>
                <span className={styles.icon} aria-hidden="true" />
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
            >
              <div className={styles.panelInner}>
                <p className={styles.answer}>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
