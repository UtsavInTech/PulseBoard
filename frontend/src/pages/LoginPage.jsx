import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../constants/site";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    username: "", password: "", full_name: "", email: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Demo cards on the marketing site link here as /login?u=utsav
  useEffect(() => {
    const requested = searchParams.get("u");
    if (!requested) return;
    const account = DEMO_ACCOUNTS.find((a) => a.username === requested);
    if (account) {
      setForm((p) => ({ ...p, username: account.username, password: DEMO_PASSWORD }));
    }
  }, [searchParams]);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  }

  function useDemoAccount(username) {
    setMode("login");
    setError("");
    setForm((p) => ({ ...p, username, password: DEMO_PASSWORD }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        await register({
          username: form.username,
          password: form.password,
          full_name: form.full_name || form.username,
          email: form.email || null,
        });
      }
      // On success <RedirectIfAuthed> in App.jsx forwards to /dashboard
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const demoList = (
    <div className={styles.demoList}>
      {DEMO_ACCOUNTS.map((acc) => (
        <button
          key={acc.username}
          type="button"
          className={`${styles.demoCard} ${
            form.username === acc.username ? styles.demoActive : ""
          }`}
          onClick={() => useDemoAccount(acc.username)}
        >
          <span className={styles.demoAvatar} aria-hidden="true">
            {acc.label[0].toUpperCase()}
          </span>
          <span>
            <span className={styles.demoName}>{acc.label}</span>
            <span className={styles.demoRole}>{acc.role}</span>
          </span>
          <span className={styles.demoUse}>Use →</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.page}>
      {/* ── Brand panel ──────────────────────────────────────────── */}
      <aside className={styles.aside}>
        <Link to="/" className={styles.brandLink} aria-label="PulseBoard home">
          <Logo size={30} variant="dark" tagline />
        </Link>

        <div className={styles.asideBody}>
          <span className={styles.asideLabel}>Real-Time Behavioral Intelligence</span>
          <h2 className={styles.asideTitle}>
            Sign in to the PulseBoard analytics dashboard.
          </h2>
          <p className={styles.asideText}>
            The dashboard tracks its own usage — every filter you change and every chart
            you click is recorded as an event and visualised back to you.
          </p>

          <p className={styles.demoLabel}>Demonstration accounts</p>
          {demoList}
        </div>

        <p className={styles.asideFoot}>© 2026 PulseBoard · Built by Utsav</p>
      </aside>

      {/* ── Form panel ───────────────────────────────────────────── */}
      <div className={styles.formPane}>
        <div className={styles.card}>
          <Link to="/" className={styles.mobileBrand} aria-label="PulseBoard home">
            <Logo size={30} tagline />
          </Link>

          <h1 className={styles.title}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className={styles.subtitle}>
            {mode === "login"
              ? "Sign in to your analytics dashboard"
              : "Join to start tracking your product metrics"}
          </p>

          {error && <div className={styles.error} role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="e.g. utsav"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="••••••••"
              />
            </div>

            {mode === "register" && (
              <>
                <div className={styles.field}>
                  <label htmlFor="full_name" className={styles.label}>Full name</label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    value={form.full_name}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Alex Rivera"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>Work email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="alex@company.com"
                  />
                </div>
              </>
            )}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          <p className={styles.toggle}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          {mode === "login" && (
            <div className={styles.mobileDemo}>
              <p className={styles.mobileDemoLabel}>Demonstration accounts</p>
              {demoList}
            </div>
          )}

          <Link to="/" className={styles.backLink}>
            <span aria-hidden="true">←</span> Back to PulseBoard home
          </Link>
        </div>
      </div>
    </div>
  );
}
