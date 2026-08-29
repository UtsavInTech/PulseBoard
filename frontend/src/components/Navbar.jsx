import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import styles from "./Navbar.module.css";

const ROLE_ACCENTS = {
  product_manager: "#6D4DE6",
  growth_manager: "#16A34A",
  user_researcher: "#0F9F9A",
  executive: "#1D4ED8",
};

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MENU = [
  { label: "Profile", to: "/profile", hint: "Your account details" },
  { label: "Organization", to: "/profile#organization", hint: "Workspace and product" },
  { label: "Role & permissions", to: "/profile#role", hint: "What your role changes" },
  { label: "Preferences", to: "/profile#preferences", hint: "Saved filters" },
];

/** Top bar for the signed-in analytics application. */
export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/", { replace: true });
  }

  const user = auth?.user;
  const accent = ROLE_ACCENTS[user?.role] || "var(--navy-900)";
  const name = user?.full_name || user?.username || "Member";

  return (
    <header className={styles.nav}>
      <div className={styles.left}>
        <Link to="/dashboard" className={styles.brand} aria-label="PulseBoard dashboard">
          <Logo size={28} tagline />
        </Link>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.appLabel}>Analytics</span>
      </div>

      {auth && (
        <div className={styles.right}>
          <Link to="/" className={styles.siteLink}>← Website</Link>

          <div className={styles.account} ref={wrapRef} style={{ "--acct-accent": accent }}>
            <button
              type="button"
              className={`${styles.accountBtn} ${open ? styles.accountOpen : ""}`}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <span className={styles.avatar}>{initials(name)}</span>
              <span className={styles.userInfo}>
                <span className={styles.username}>{name}</span>
                <span className={styles.userMeta}>
                  {user?.role_label}
                  {user?.organization ? ` · ${user.organization}` : ""}
                </span>
              </span>
              <span className={styles.chevron} aria-hidden="true">▾</span>
            </button>

            <div
              className={`${styles.menu} ${open ? styles.menuOpen : ""}`}
              role="menu"
              aria-hidden={!open}
            >
              <div className={styles.menuHead}>
                <span className={styles.menuAvatar}>{initials(name)}</span>
                <span className={styles.menuIdentity}>
                  <span className={styles.menuName}>{name}</span>
                  {user?.email && <span className={styles.menuEmail}>{user.email}</span>}
                  <span className={styles.menuRole}>{user?.role_label}</span>
                </span>
              </div>

              <div className={styles.menuGroup}>
                {MENU.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    role="menuitem"
                    className={styles.menuItem}
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.menuLabel}>{item.label}</span>
                    <span className={styles.menuHint}>{item.hint}</span>
                  </Link>
                ))}
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  className={styles.menuItem}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.menuLabel}>Documentation &amp; support ↗</span>
                  <span className={styles.menuHint}>API reference</span>
                </a>
              </div>

              <button
                type="button"
                role="menuitem"
                className={styles.signOut}
                onClick={handleLogout}
                tabIndex={open ? 0 : -1}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
