import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "../Logo";
import Button from "./Button";
import { NAV_LINKS } from "../../constants/site";
import styles from "./SiteNavbar.module.css";

export default function SiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll while the mobile panel is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // The bar goes solid once scrolled, and while the mobile menu is open so the
  // panel and the bar read as one surface.
  const solid = scrolled || menuOpen;

  return (
    <>
      <header className={`${styles.nav} ${solid ? styles.solid : ""}`}>
        <div className={styles.island}>
          <Link to="/" className={styles.brand} aria-label="PulseBoard home">
            <Logo
              size={solid ? 26 : 28}
              variant={solid ? "light" : "dark"}
              tagline
            />
          </Link>

          <nav className={styles.links} aria-label="Main">
            {NAV_LINKS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.linkActive : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.right}>
            <span className={styles.desktopCta}>
              <Button to="/login" variant="primary" size="sm" arrow>
                Explore Demo
              </Button>
            </span>

            <button
              type="button"
              className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className={styles.burgerBox}>
                <span className={styles.burgerBar} />
                <span className={styles.burgerBar} />
                <span className={styles.burgerBar} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`${styles.mobilePanel} ${menuOpen ? styles.mobileOpen : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className={styles.mobileInner}>
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `${styles.mobileLink} ${isActive ? styles.mobileLinkActive : ""}`
              }
              tabIndex={menuOpen ? 0 : -1}
            >
              {label}
            </NavLink>
          ))}
          <div className={styles.mobileCta}>
            <Button to="/login" variant="primary" block arrow tabIndex={menuOpen ? 0 : -1}>
              Explore Demo
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
