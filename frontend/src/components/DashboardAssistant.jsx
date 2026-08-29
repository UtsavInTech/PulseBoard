import React, { useCallback, useEffect, useRef, useState } from "react";
import { dashboardAI, streamDashboardChat } from "../api/client";
import styles from "./DashboardAssistant.module.css";

const ROLE_ACCENTS = {
  product_manager: { accent: "#6D4DE6", soft: "rgba(109, 77, 230, 0.12)" },
  growth_manager: { accent: "#16A34A", soft: "rgba(22, 163, 74, 0.12)" },
  user_researcher: { accent: "#0F9F9A", soft: "rgba(15, 159, 154, 0.12)" },
  executive: { accent: "#1D4ED8", soft: "rgba(29, 78, 216, 0.12)" },
};

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

const SparkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.5 13.8 9 19.5 10.5 13.8 12 12 17.5 10.2 12 4.5 10.5 10.2 9z" />
  </svg>
);

/** Highlight figures so an answer can be scanned rather than read. */
const METRIC = /(\d[\d,]*\.?\d*\s?%|\d[\d,]{2,}|\b\d+\.\d+\b)/g;

function withMetrics(text) {
  const parts = text.split(METRIC);
  return parts.map((part, i) =>
    METRIC.test(part) && i % 2 === 1 ? (
      <span className={styles.metric} key={i}>{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/**
 * Authenticated analytics assistant. Answers about the signed-in user's own
 * organization by querying live data — distinct from the public website
 * assistant, which answers product questions from a knowledge base.
 */
export default function DashboardAssistant({ filters }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailed, setLastFailed] = useState("");

  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    dashboardAI
      .info()
      .then(({ data }) => { if (!cancelled) setInfo(data); })
      .catch(() => { if (!cancelled) setInfo(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (text, { retry = false } = {}) => {
      const message = (text ?? draft).trim();
      if (!message || loading) return;

      setError("");
      setLastFailed("");
      const prior = retry ? messages.slice(0, -1) : messages;
      if (!retry) {
        setDraft("");
        setMessages((prev) => [...prev, { role: "user", content: message }]);
      }
      setLoading(true);

      // Share the dashboard's current filters so the assistant answers about
      // the same slice of data the user is looking at.
      const context = {
        start_date: filters?.startDate || null,
        end_date: filters?.endDate || null,
        age: filters?.age || null,
        gender: filters?.gender || null,
      };

      try {
        let streamed = "";
        const outcome = await streamDashboardChat(
          message,
          prior,
          context,
          (chunk) => {
            streamed += chunk;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                next[next.length - 1] = { ...last, content: streamed };
              } else {
                next.push({ role: "assistant", content: streamed, streaming: true });
              }
              return next;
            });
          }
        );
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            next[next.length - 1] = {
              role: "assistant",
              content: streamed,
              tools: outcome?.tools_used || [],
            };
          }
          return next;
        });
      } catch (err) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === "assistant" && last.streaming ? prev.slice(0, -1) : prev;
        });
        setError(
          err?.status === 401
            ? "Your session expired. Please sign in again."
            : "Couldn't reach the analytics assistant. Please try again."
        );
        setLastFailed(message);
      } finally {
        setLoading(false);
      }
    },
    [draft, loading, messages, filters]
  );

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!info?.available) return null;

  const theme = ROLE_ACCENTS[info.role] || ROLE_ACCENTS.executive;
  const style = { "--ai-accent": theme.accent, "--ai-soft": theme.soft };
  const showSuggestions = messages.length === 0 && !loading;

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherHidden : ""}`}
        style={style}
        onClick={() => setOpen(true)}
        aria-label="Open the analytics assistant"
      >
        <span className={styles.spark}><SparkIcon /></span>
        Ask your data
      </button>

      <div
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        style={style}
        role="dialog"
        aria-label="PulseBoard analytics assistant"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <SparkIcon />
          <span className={styles.headerText}>
            <span className={styles.headerTitle}>Analytics Assistant</span>
            <span className={styles.headerSub}>
              {info.role_label} view · {info.product}
            </span>
          </span>
          <button
            type="button"
            className={styles.close}
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            tabIndex={open ? 0 : -1}
          >
            ✕
          </button>
        </div>

        <div className={styles.log} ref={logRef}>
          {messages.length === 0 && (
            <p className={styles.intro}>
              Ask a question about <span className={styles.introStrong}>{info.product}</span>{" "}
              and I'll query your organization's live event data to answer it, from your{" "}
              {info.role_label} perspective.
            </p>
          )}

          {messages.map((m, i) => (
            <React.Fragment key={`${m.role}-${i}`}>
              <div className={`${styles.msg} ${m.role === "user" ? styles.fromUser : styles.fromBot}`}>
                {m.role === "assistant" ? withMetrics(m.content) : m.content}
              </div>
              {m.tools?.length > 0 && (
                <span className={styles.tools}>
                  Answered using {[...new Set(m.tools)].join(", ").replace(/_/g, " ")}
                </span>
              )}
            </React.Fragment>
          ))}

          {showSuggestions && (
            <div className={styles.suggestions}>
              <span className={styles.suggestLabel}>Try asking</span>
              {info.suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => send(q)}
                  tabIndex={open ? 0 : -1}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {loading && !messages[messages.length - 1]?.streaming && (
            <div className={styles.typing} aria-label="Querying your data">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          )}

          {error && (
            <div className={styles.error} role="alert">
              {error}
              {lastFailed && (
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => send(lastFailed, { retry: true })}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.composer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            placeholder={`Ask about ${info.product}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={2000}
            tabIndex={open ? 0 : -1}
          />
          <button
            type="button"
            className={styles.send}
            onClick={() => send()}
            disabled={loading || !draft.trim()}
            aria-label="Send question"
            tabIndex={open ? 0 : -1}
          >
            <SendIcon />
          </button>
        </div>

        <p className={styles.disclaimer}>
          Answers are computed from your event data. Figures are only as complete
          as what PulseBoard tracks.
        </p>
      </div>
    </>
  );
}
