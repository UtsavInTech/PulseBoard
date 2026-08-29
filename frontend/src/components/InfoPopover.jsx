import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./InfoPopover.module.css";

const PANEL_WIDTH = 348;
const GAP = 10;
const MARGIN = 12;

/**
 * "How does this work?" affordance for an analytics component.
 *
 * Every panel answers the same four questions so a first-time viewer can read
 * any card: what it shows, how it is calculated, why it matters, and a worked
 * example. The example is passed in from live data — never invented here.
 *
 * The panel renders through a portal because sibling cards apply a transform
 * on hover, which creates a stacking context that would otherwise paint over
 * the panel and clip it at the card's edge.
 */
export default function InfoPopover({ title, what, how, why, example }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight || 420;

    // Prefer below the trigger; flip above when the answer would be cut off.
    const spaceBelow = window.innerHeight - r.bottom - MARGIN;
    const above = spaceBelow < panelHeight && r.top > spaceBelow;
    const top = above ? Math.max(MARGIN, r.top - GAP - panelHeight) : r.bottom + GAP;

    // Centre on the trigger, then clamp so the panel stays fully on screen.
    const ideal = r.left + r.width / 2 - PANEL_WIDTH / 2;
    const left = Math.min(
      Math.max(MARGIN, ideal),
      window.innerWidth - PANEL_WIDTH - MARGIN
    );
    setPos({ top, left, above });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !panelRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const panel = (
    <div
      ref={panelRef}
      className={`${styles.panel} ${open ? styles.panelOpen : ""} ${
        pos?.above ? styles.above : ""
      }`}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      role="dialog"
      aria-label={`About ${title}`}
      aria-hidden={!open}
    >
      <div className={styles.header}>
        <span className={styles.headerMark} aria-hidden="true">i</span>
        <p className={styles.title}>{title}</p>
      </div>

      <div className={styles.body}>
        <div className={styles.block}>
          <span className={styles.label}>What this shows</span>
          <p className={styles.text}>{what}</p>
        </div>
        <div className={styles.block}>
          <span className={styles.label}>How it&apos;s calculated</span>
          <p className={styles.text}>{how}</p>
        </div>
        <div className={styles.block}>
          <span className={styles.label}>Why it matters</span>
          <p className={styles.text}>{why}</p>
        </div>

        {example && (
          <div className={styles.answer}>
            <span className={styles.answerLabel}>In this data</span>
            <p className={styles.answerText}>{example}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <span className={`${styles.wrap} ${open ? styles.open : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-label={`How “${title}” works`}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && createPortal(panel, document.body)}
    </span>
  );
}
