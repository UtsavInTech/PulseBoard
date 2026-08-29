import React from "react";
import styles from "./ComparisonTable.module.css";

/**
 * A two-stage breakdown: how many users reached a step per segment, and how
 * many converted. Rows the backend flagged as notably strong or weak get a
 * coloured marker — the tone is computed from the data, not chosen here.
 */
export default function ComparisonTable({ columns = [], rows = [] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.rate), 1);

  return (
    <div className={styles.table}>
      <div className={styles.head}>
        {columns.map((c) => (
          <span className={styles.th} key={c}>{c}</span>
        ))}
      </div>

      {rows.map((r) => (
        <div className={`${styles.row} ${styles[r.tone] || ""}`} key={r.label}>
          <span className={styles.label}>
            <span
              className={`${styles.dot} ${
                r.tone === "positive"
                  ? styles.dotPositive
                  : r.tone === "attention"
                  ? styles.dotAttention
                  : ""
              }`}
              aria-hidden="true"
            />
            <span className={styles.labelText}>{r.label}</span>
          </span>
          <span className={styles.num}>{r.value.toLocaleString()}</span>
          <span className={styles.num}>{r.secondary.toLocaleString()}</span>
          <span className={styles.rate}>
            <span className={styles.bar}>
              <span className={styles.barFill} style={{ width: `${(r.rate / max) * 100}%` }} />
            </span>
            {r.rate}%
          </span>
        </div>
      ))}
    </div>
  );
}
