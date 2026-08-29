import React, { useState } from "react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";
import { useAuth } from "../context/AuthContext";
import styles from "./ProfilePage.module.css";

/** What each role changes about the analytics presented — not permissions. */
const ROLE_FOCUS = {
  product_manager: [
    "Feature and category adoption across the product",
    "The marketplace funnel and where users stop progressing",
    "Behaviours associated with users who convert",
  ],
  growth_manager: [
    "Acquisition channels, and which of them bring buyers",
    "Activation, conversion and returning-user rates",
    "Where the signup-to-purchase funnel leaks",
  ],
  user_researcher: [
    "The paths users actually take through a session",
    "Repeated actions and abandonment as friction signals",
    "Behavioural differences between devices",
  ],
  executive: [
    "Overall product health in four headline numbers",
    "The largest leak in the customer journey",
    "Cross-role signals that need attention this period",
  ],
};

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <span className={styles.key}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { auth } = useAuth();
  const [cleared, setCleared] = useState(false);
  const user = auth?.user;
  if (!user) return null;

  const role = user.role || "product_manager";
  const name = user.full_name || user.username;
  const focus = ROLE_FOCUS[role] || [];

  function clearSavedFilters() {
    Cookies.remove("analytics_filters");
    setCleared(true);
  }

  return (
    <div className={styles.page} data-role={role}>
      <Link to="/dashboard" className={styles.back}>← Back to dashboard</Link>

      {/* ── Identity ─────────────────────────────────────────────── */}
      <section className={styles.identity}>
        <span className={styles.avatar}>{initials(name)}</span>
        <div className={styles.identityBody}>
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.subline}>
            {user.role_label}
            {user.organization ? ` · ${user.organization}` : ""}
          </p>
          <div className={styles.tags}>
            <span className={styles.tag}>{user.role_label}</span>
            {user.is_demo && (
              <span className={`${styles.tag} ${styles.tagDemo}`}>Demo account</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Account ──────────────────────────────────────────────── */}
      <section className={styles.card} id="account">
        <h2 className={styles.cardTitle}>Account</h2>
        <p className={styles.cardNote}>
          Your PulseBoard identity as an employee of {user.organization || "your company"}.
        </p>
        <div className={styles.rows}>
          <Row label="Name">{name}</Row>
          <Row label="Email">
            {user.email ? <a href={`mailto:${user.email}`}>{user.email}</a> : "—"}
          </Row>
          <Row label="Username">
            <span className={styles.mono}>{user.username}</span>
          </Row>
          <Row label="Account type">
            {user.is_demo
              ? "Demo account — seeded for demonstration"
              : "Standard account"}
          </Row>
        </div>
      </section>

      {/* ── Organization ─────────────────────────────────────────── */}
      <section className={styles.card} id="organization">
        <h2 className={styles.cardTitle}>Organization &amp; workspace</h2>
        <p className={styles.cardNote}>
          Everyone in this organization analyses the same end-user dataset. Your role
          changes the perspective, never the underlying data.
        </p>
        <div className={styles.rows}>
          <Row label="Organization">{user.organization || "—"}</Row>
          <Row label="Product analysed">{user.product || "—"}</Row>
          <Row label="Data source">
            {user.is_demo
              ? "Synthetic seeded events, generated for demonstration"
              : "Events received from your product"}
          </Row>
        </div>
      </section>

      {/* ── Role ─────────────────────────────────────────────────── */}
      <section className={styles.card} id="role">
        <h2 className={styles.cardTitle}>Role &amp; permissions</h2>
        <p className={styles.roleNote}>
          Your role determines the perspective PulseBoard uses when presenting product
          analytics.
        </p>
        <p className={styles.cardNote}>
          As {user.role_label}, your dashboard prioritises:
        </p>
        <ul className={styles.roleList}>
          {focus.map((item) => (
            <li className={styles.roleItem} key={item}>{item}</li>
          ))}
        </ul>
        <div className={styles.rows} style={{ marginTop: 20 }}>
          <Row label="Role">{user.role_label}</Row>
          <Row label="Data access">
            Full organization dataset — identical for every role
          </Row>
        </div>
      </section>

      {/* ── Preferences ──────────────────────────────────────────── */}
      <section className={styles.card} id="preferences">
        <h2 className={styles.cardTitle}>Preferences</h2>
        <p className={styles.cardNote}>
          PulseBoard remembers the date range and demographic filters you last applied,
          stored in your browser so the dashboard opens where you left it.
        </p>
        <div className={styles.prefRow}>
          <span className={styles.value}>Saved dashboard filters</span>
          {cleared ? (
            <span className={styles.prefDone}>Cleared — reload to see defaults</span>
          ) : (
            <button type="button" className={styles.resetBtn} onClick={clearSavedFilters}>
              Reset saved filters
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
