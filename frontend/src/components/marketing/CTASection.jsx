import React from "react";
import Button from "./Button";
import Reveal from "../Reveal";
import styles from "./CTASection.module.css";

export default function CTASection() {
  return (
    <section className={styles.cta}>
      <div className={styles.inner}>
        <Reveal>
          <div className={styles.rule} />
          <h2 className={styles.title}>
            Your product is generating signals every second.
            <br />
            <em>Are you listening to them?</em>
          </h2>
        </Reveal>
        <Reveal delay={90}>
          <p className={styles.sub}>
            Explore PulseBoard and see what behavioral intelligence could look like.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div className={styles.actions}>
            <Button to="/login" variant="onDark" size="lg" arrow>
              Explore Demo
            </Button>
            <Button to="/contact" variant="ghostOnDark" size="lg" arrow>
              Talk to Utsav
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
