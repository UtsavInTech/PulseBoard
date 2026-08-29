import React from "react";
import styles from "./DashboardPreview.module.css";

/**
 * Static, presentational preview of the PulseBoard dashboard for the hero.
 * Mirrors the real dashboard's structure (KPIs, feature usage, daily trend,
 * event stream). Illustrative figures only — the live numbers come from the
 * actual dashboard at /dashboard.
 */

const FEATURES = [
  { name: "dashboard_load", pct: 100, value: 412 },
  { name: "bar_chart_click", pct: 78, value: 321 },
  { name: "date_filter", pct: 61, value: 252 },
  { name: "age_filter", pct: 44, value: 181 },
  { name: "gender_filter", pct: 31, value: 128 },
];

const EVENTS = [
  { event: "filter_apply", user: "utsav", time: "just now" },
  { event: "bar_chart_click", user: "utsav1", time: "6s" },
  { event: "date_filter", user: "utsav2", time: "14s" },
  { event: "dashboard_load", user: "utsav1", time: "28s" },
];

const TREND = [18, 26, 22, 34, 30, 44, 39, 52, 48, 61, 57, 72];

function trendPaths(values, w = 320, h = 110, pad = 8) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1);

  const pts = values.map((v, i) => [
    pad + i * step,
    pad + (h - pad * 2) * (1 - (v - min) / span),
  ]);

  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

export default function DashboardPreview() {
  const { line, area, last } = trendPaths(TREND);

  return (
    <div className={styles.frame} role="img" aria-label="Preview of the PulseBoard analytics dashboard">
      <div className={styles.chrome}>
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <div className={styles.urlBar}>pulseboard.app/dashboard</div>
        <span className={styles.live}>
          <span className={styles.pulseDot} />
          Live
        </span>
      </div>

      <div className={styles.body}>
        {/* ── KPIs ─────────────────────────────────────────────────── */}
        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Active Users</p>
            <p className={styles.kpiValue}>1,284</p>
            <p className={styles.kpiDelta}>↑ 12.4% vs last week</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Events Today</p>
            <p className={styles.kpiValue}>38,940</p>
            <p className={styles.kpiDelta}>↑ 8.1% vs yesterday</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Features Tracked</p>
            <p className={styles.kpiValue}>10</p>
            <p className={styles.kpiMuted}>distinct interactions</p>
          </div>
        </div>

        <div className={styles.panels}>
          {/* ── Feature usage ──────────────────────────────────────── */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>Feature Usage</span>
              <span className={styles.panelMeta}>last 30 days</span>
            </div>
            <div className={styles.bars}>
              {FEATURES.map((f, i) => (
                <div className={styles.barRow} key={f.name}>
                  <span className={styles.barLabel}>{f.name.replace(/_/g, " ")}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.barFill}
                      style={{
                        "--w": `${f.pct}%`,
                        animationDelay: `${300 + i * 110}ms`,
                        background: i === 0 ? "var(--navy-800)" : "var(--blue-600)",
                        opacity: 1 - i * 0.12,
                      }}
                    />
                  </span>
                  <span className={styles.barValue}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Trend ──────────────────────────────────────────────── */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>User Activity</span>
              <span className={styles.panelMeta}>daily events</span>
            </div>
            <svg className={styles.chart} viewBox="0 0 320 110" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pbTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[26, 52, 78].map((y) => (
                <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#E2E8F0" strokeWidth="1" />
              ))}
              <path className={styles.chartArea} d={area} fill="url(#pbTrendFill)" />
              <path
                className={styles.chartLine}
                d={line}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle className={styles.chartArea} cx={last[0]} cy={last[1]} r="3.4" fill="#0F9F9A" />
            </svg>
            <div className={styles.axis}>
              <span className={styles.axisLabel}>Mar 1</span>
              <span className={styles.axisLabel}>Mar 15</span>
              <span className={styles.axisLabel}>Mar 30</span>
            </div>
          </div>
        </div>

        {/* ── Live events ──────────────────────────────────────────── */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Real-Time Events</span>
            <span className={styles.panelMeta}>streaming</span>
          </div>
          <div className={styles.feed}>
            {EVENTS.map((e) => (
              <div className={styles.feedRow} key={e.event + e.user}>
                <span className={styles.feedDot} />
                <span className={styles.feedEvent}>{e.event}</span>
                <span className={styles.feedUser}>· {e.user}</span>
                <span className={styles.feedTime}>{e.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
