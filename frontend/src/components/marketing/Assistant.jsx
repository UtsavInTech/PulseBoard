import React, { useCallback, useEffect, useRef, useState } from "react";
import { aiAPI, streamChat } from "../../api/client";
import styles from "./Assistant.module.css";

const WELCOME =
  "Hi — I'm the PulseBoard assistant. I can explain how the product works, " +
  "what each role sees, and how the demo is set up. I can also help you " +
  "request a demo or draft a message to the team.";

const SUGGESTIONS = [
  "What is PulseBoard?",
  "What's the difference between PulseBoard users and end users?",
  "What does the Growth Manager view show?",
  "How does the demo work?",
  "I'd like to request a demo",
];

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

export default function Assistant() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailed, setLastFailed] = useState("");

  const logRef = useRef(null);
  const inputRef = useRef(null);

  // Hide entirely when the server has no assistant configured.
  useEffect(() => {
    let cancelled = false;
    aiAPI
      .status()
      .then(({ data }) => { if (!cancelled) setAvailable(Boolean(data?.available)); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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

      // On a retry the failed turn is already in the transcript — resend it
      // rather than appending a second copy of the same question.
      const priorTurns = retry ? messages.slice(0, -1) : messages;
      const history = priorTurns.filter((m) => m.content !== WELCOME);

      if (!retry) {
        setDraft("");
        setMessages((prev) => [...prev, { role: "user", content: message }]);
      }
      setLoading(true);

      try {
        // Stream first so text appears as it is generated. The reply bubble is
        // created on the first delta, so the typing indicator stays visible
        // until there is something to show.
        let streamed = "";
        const outcome = await streamChat(message, history, (chunk) => {
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
        });

        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            next[next.length - 1] = {
              role: "assistant",
              content: streamed,
              saved: outcome.demo_request_saved,
            };
            return next;
          }
          // Nothing streamed (e.g. a tool-only turn) — fall back to one request.
          return next;
        });

        if (!streamed) {
          const { data } = await aiAPI.chat(message, history);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, saved: data.demo_request_saved },
          ]);
        }
      } catch (err) {
        // Drop a partial bubble before surfacing the error.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === "assistant" && last.streaming ? prev.slice(0, -1) : prev;
        });
        let detail;
        if (err?.code === "ECONNABORTED") {
          detail = "That took longer than expected. Please try again.";
        } else if (err?.response?.status === 503) {
          detail = "The assistant isn't configured on this server yet.";
        } else {
          detail =
            err?.response?.data?.detail ||
            "Something went wrong reaching the assistant. Please try again.";
        }
        setError(detail);
        setLastFailed(message);
      } finally {
        setLoading(false);
      }
    },
    [draft, loading, messages]
  );

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!available) return null;

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherHidden : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open the PulseBoard assistant"
      >
        <span className={styles.launcherDot} aria-hidden="true" />
        Ask PulseBoard
      </button>

      <div
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        role="dialog"
        aria-label="PulseBoard assistant"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <SparkIcon />
          <span className={styles.headerText}>
            <span className={styles.headerTitle}>PulseBoard Assistant</span>
            <span className={styles.headerSub}>Answers from our product docs</span>
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
          {messages.map((m, i) => (
            <React.Fragment key={`${m.role}-${i}`}>
              <div className={`${styles.msg} ${m.role === "user" ? styles.fromUser : styles.fromBot}`}>
                {m.content}
              </div>
              {m.saved && (
                <div className={styles.saved}>✓ Request saved — the team will be in touch</div>
              )}
            </React.Fragment>
          ))}

          {showSuggestions && (
            <div className={styles.suggestions}>
              <span className={styles.suggestLabel}>Try asking</span>
              {SUGGESTIONS.map((q) => (
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
            <div className={styles.typing} aria-label="Assistant is typing">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          )}

          {error && (
            <div className={styles.error} role="alert">
              {error}
              {lastFailed && (
                <button type="button" className={styles.retry} onClick={() => send(lastFailed, { retry: true })}>
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
            placeholder="Ask about PulseBoard…"
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
            aria-label="Send message"
            tabIndex={open ? 0 : -1}
          >
            <SendIcon />
          </button>
        </div>

        <p className={styles.disclaimer}>
          AI-generated answers about a prototype — please verify anything important.
        </p>
      </div>
    </>
  );
}
