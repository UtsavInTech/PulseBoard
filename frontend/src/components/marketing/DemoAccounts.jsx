import React from "react";
import { Link } from "react-router-dom";
import { DEMO_ACCOUNTS, DEMO_COMPANY, DEMO_PASSWORD } from "../../constants/site";
import styles from "./DemoAccounts.module.css";

/**
 * Seeded demo accounts. Each card links to the real sign-in page with the
 * username prefilled — authentication and the dashboard are unchanged.
 *
 * All accounts are employees of one demo company reading one shared end-user
 * dataset; the role only changes the analytical perspective.
 */
export default function DemoAccounts({ tone = "light" }) {
  const dark = tone === "dark";
  return (
    <>
      <div className={`${styles.explainer} ${dark ? styles.dark : ""}`}>
        <div className={styles.explainerIntro}>
          <h3 className={styles.explainerTitle}>How the PulseBoard demo works</h3>
          <p className={styles.explainerLead}>
            PulseBoard connects to a company&apos;s digital product, collects interaction
            events from its end users, and turns those events into useful insights for
            different teams.
          </p>
        </div>

        <div className={styles.explainerSplit}>
          <div className={styles.explainerItem}>
            <span className={styles.explainerTag}>PulseBoard users</span>
            <p className={styles.explainerText}>
              Employees of the company using PulseBoard. Product Managers, Growth teams,
              Researchers and Executives use PulseBoard to understand what is happening
              in their product.
            </p>
          </div>
          <div className={styles.explainerItem}>
            <span className={styles.explainerTag}>End users</span>
            <p className={styles.explainerText}>
              The actual people using the company&apos;s website or application. Their
              interactions generate the events PulseBoard analyzes.
            </p>
          </div>
        </div>

        <p className={styles.explainerNote}>
          The accounts below are employees of <strong>{DEMO_COMPANY.name}</strong>, a
          fictional marketplace, all analysing the same <strong>{DEMO_COMPANY.product}</strong>{" "}
          data. They use the same underlying product data, but each role focuses on
          different questions.
        </p>

        <p className={styles.explainerDisclosure}>
          Demo environment — all users, events and metrics shown are synthetic data
          generated for demonstration purposes.
        </p>
      </div>

      <div className={`${styles.grid} ${dark ? styles.dark : ""}`}>
      {DEMO_ACCOUNTS.map((acc) => (
        <Link
          key={acc.username}
          to={`/login?u=${acc.username}`}
          className={styles.card}
        >
          <span className={styles.avatar} aria-hidden="true">
            {acc.label[0].toUpperCase()}
          </span>
          <span className={styles.name}>{acc.label}</span>
          <span className={styles.role}>{acc.role}</span>
          <span className={styles.focus}>{acc.focus}</span>
          <span className={styles.credentials}>
            {acc.username} / {DEMO_PASSWORD}
          </span>
          <span className={styles.cta}>
            Explore Dashboard <span aria-hidden="true">→</span>
          </span>
        </Link>
      ))}
      </div>
    </>
  );
}
