import React from "react";
import styles from "./BackgroundFX.module.css";

/**
 * Fixed ambient background for the public site — three slow-drifting gradient
 * fields at 10–13% opacity. Purely decorative and non-interactive; sits behind
 * all content on z-index -1.
 */
export default function BackgroundFX() {
  return (
    <div className={styles.layer} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blob1}`} />
      <span className={`${styles.blob} ${styles.blob2}`} />
      <span className={`${styles.blob} ${styles.blob3}`} />
    </div>
  );
}
