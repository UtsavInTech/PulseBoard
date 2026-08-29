import React from "react";
import styles from "./Funnel.module.css";

/**
 * Horizontal funnel bars. Each step shows the number of distinct end users
 * who reached it, the conversion from step one, and the drop-off from the
 * previous step.
 */
export default function Funnel({ steps = [] }) {
  if (!steps.length) return null;
  const max = Math.max(...steps.map((s) => s.users), 1);

  return (
    <div className={styles.funnel}>
      {steps.map((s, i) => (
        <div className={styles.step} key={s.step}>
          <span className={styles.label}>{s.step}</span>
          <span className={styles.track}>
            <span
              className={styles.fill}
              style={{
                "--w": `${Math.max((s.users / max) * 100, 2)}%`,
                animationDelay: `${i * 90}ms`,
                background:
                  i === steps.length - 1 ? "var(--teal-600)" : "var(--navy-800)",
                opacity: 1 - i * 0.08,
              }}
            />
            <span className={styles.fillValue}>{s.users.toLocaleString()}</span>
          </span>
          <span className={styles.meta}>
            <span className={styles.conversion}>{s.conversion}%</span>
            {i > 0 ? (
              <span className={styles.drop}>−{s.drop_off}%</span>
            ) : (
              <span className={styles.dropNone}>of total</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
