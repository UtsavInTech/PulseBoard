import React from "react";
import styles from "./StatCard.module.css";

export default function StatCard({ label, value, sub, color = "accent", icon }) {
  return (
    <div className={styles.card}>
      {icon && <div className={styles.icon} style={{ color: `var(--${color})` }}>{icon}</div>}
      <div>
        <p className={styles.label}>{label}</p>
        <p className={styles.value} style={{ color: `var(--${color})` }}>
          {value ?? "—"}
        </p>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
    </div>
  );
}
