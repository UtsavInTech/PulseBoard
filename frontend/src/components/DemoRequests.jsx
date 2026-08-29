import React, { useEffect, useState } from "react";
import { aiAPI } from "../api/client";
import styles from "./DemoRequests.module.css";

function relativeTime(iso) {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}

/**
 * Demo/call bookings captured by the site assistant. Read-only; the endpoint
 * is JWT-protected because these are real contact details.
 */
export default function DemoRequests({ onCount }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    aiAPI
      .demoRequests({ limit: 25 })
      .then(({ data }) => {
        if (cancelled) return;
        setRows(data);
        onCount?.(data.length);
      })
      .catch(() => { if (!cancelled) setError("Couldn't load booking requests."); });
    return () => { cancelled = true; };
  }, [onCount]);

  if (error) return <div className={styles.empty}>{error}</div>;
  if (!rows.length) return <div className={styles.empty}>No booking requests yet</div>;

  return (
    <div className={styles.list}>
      {rows.map((r) => (
        <div className={styles.row} key={r.id}>
          <span className={styles.name}>
            {r.name}
            {r.company && <span className={styles.company}> · {r.company}</span>}
          </span>
          <span className={styles.when}>{relativeTime(r.created_at)}</span>
          <span className={styles.meta}>
            <span className={styles.slot}>{r.preferred_time}</span>
            <a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a>
            <a href={`mailto:${r.email}`}>{r.email}</a>
          </span>
        </div>
      ))}
    </div>
  );
}
