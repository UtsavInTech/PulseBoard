import React, { useId } from "react";
import styles from "./Logo.module.css";

/** The live trace: flat baseline, one decisive spike. */
const TRACE = "M3.5 28.6H12L14.3 24.8L16.8 32.4L19.5 20.6L22 28.6H36.5";

/**
 * PulseBoard logo — a rounded "board" holding three ascending data bars with a
 * live pulse trace running across them, plus the two-tone wordmark.
 *
 *   variant   "light" (dark wordmark, for light backgrounds) | "dark"
 *   size      height of the mark in px; the wordmark scales from it
 *   wordmark  render the "PulseBoard" text
 *   tagline   render "TRACK | ANALYZE | GROW" beneath the wordmark
 *   animated  play the bar-rise / trace-draw animation on mount
 */
export default function Logo({
  size = 32,
  variant = "light",
  withWordmark = true,
  tagline = false,
  animated = true,
  className = "",
}) {
  // Unique gradient ids — several logos can share a page.
  const uid = useId().replace(/:/g, "");
  const onDark = variant === "dark";

  const g = (name) => `pb-${name}-${uid}`;

  return (
    <span
      className={[styles.logo, animated ? styles.animated : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--logo-gap": `${size * 0.32}px`,
        "--logo-word-color": onDark ? "#FFFFFF" : "var(--navy-900)",
        "--logo-gradient": onDark
          ? "linear-gradient(96deg, #A78BFA 0%, #60A5FA 46%, #2DD4BF 100%)"
          : "linear-gradient(96deg, #6D4DE6 0%, #2563EB 46%, #0F9F9A 100%)",
        "--logo-tag-1": onDark ? "#A78BFA" : "#6D4DE6",
        "--logo-tag-2": onDark ? "#60A5FA" : "#2563EB",
        "--logo-tag-3": onDark ? "#2DD4BF" : "#0F9F9A",
      }}
    >
      <svg
        className={styles.mark}
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        role="img"
        aria-label="PulseBoard"
      >
        <defs>
          <linearGradient id={g("board")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#123452" />
            <stop offset="100%" stopColor="#0B1F33" />
          </linearGradient>
          <linearGradient id={g("bar1")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id={g("bar2")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5B3FD6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id={g("bar3")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0F9F9A" />
            <stop offset="100%" stopColor="#2DD4A7" />
          </linearGradient>
        </defs>

        {/* Board */}
        <rect width="40" height="40" rx="11" fill={`url(#${g("board")})`} />

        {/* Ascending data bars, baseline at y=31 */}
        <rect
          className={`${styles.bar} ${styles.bar1}`}
          x="10.5" y="17" width="5" height="15" rx="2.5"
          fill={`url(#${g("bar1")})`}
        />
        <rect
          className={`${styles.bar} ${styles.bar2}`}
          x="17.5" y="11.5" width="5" height="20.5" rx="2.5"
          fill={`url(#${g("bar2")})`}
        />
        <rect
          className={`${styles.bar} ${styles.bar3}`}
          x="24.5" y="7" width="5" height="25" rx="2.5"
          fill={`url(#${g("bar3")})`}
        />

        {/* Live trace running across the board, over the bars */}
        <path
          className={styles.pulse}
          d={TRACE}
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {withWordmark && (
        <span className={styles.stack}>
          <span className={styles.wordmark} style={{ fontSize: size * 0.6 }}>
            <span className={styles.word1}>Pulse</span>
            <span className={styles.word2}>Board</span>
          </span>

          {tagline && (
            <span
              className={styles.tagline}
              style={{
                // Floor the size so the lockup stays readable in the navbar,
                // and tighten tracking as it shrinks so it never outruns the
                // wordmark above it.
                fontSize: Math.max(size * 0.2, 7.5),
                letterSpacing: size < 32 ? "0.14em" : "0.22em",
              }}
            >
              <span className={styles.tagTrack}>Track</span>
              <span className={styles.tagRule} aria-hidden="true" />
              <span className={styles.tagAnalyze}>Analyze</span>
              <span className={styles.tagRule} aria-hidden="true" />
              <span className={styles.tagGrow}>Grow</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
