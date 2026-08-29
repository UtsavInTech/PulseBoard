import React from "react";
import { Link } from "react-router-dom";
import Logo from "../Logo";
import { CONTACT } from "../../constants/site";
import styles from "./SiteFooter.module.css";

const PRODUCT_LINKS = [
  { label: "Analytics", to: "/login" },
  { label: "Tracking", to: "/login" },
  { label: "Insights", to: "/login" },
];

const COMPANY_LINKS = [
  { label: "About", to: "/about" },
  { label: "Solutions", to: "/solutions" },
  { label: "Careers", to: "/careers" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
];

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <Logo size={34} variant="dark" tagline />
            <p className={styles.tagline}>
              Real-time behavioral intelligence for modern digital products.
            </p>
          </div>

          <div>
            <h3 className={styles.colTitle}>Product</h3>
            <ul className={styles.list}>
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link className={styles.link} to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.colTitle}>Company</h3>
            <ul className={styles.list}>
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link className={styles.link} to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={styles.colTitle}>Connect</h3>
            <ul className={styles.list}>
              <li>
                <a className={styles.link} href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <a className={styles.link} href={CONTACT.whatsappUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </li>
              <li>
                <a className={styles.link} href={`mailto:${CONTACT.email}`}>Email</a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© 2026 PulseBoard</span>
          <span>
            Built by <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">Utsav</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
