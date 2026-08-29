import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * The backend's public base URL, for links that must point at the API itself
 * (Swagger, health). Hardcoding "http://localhost:8000" in components meant
 * those links were dead in every deployed environment.
 */
export const API_BASE_URL = BASE_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ─── Attach JWT from localStorage ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Global 401 handler ──────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/register", data),
  login: (data) => api.post("/login", data),
};

// ─── Tracking ─────────────────────────────────────────────────────────────
let trackQueue = [];
let trackTimer = null;

/**
 * Fire-and-forget tracking. Batches rapid clicks into a single call
 * every 300 ms to avoid flooding the server.
 */
export const track = (featureName) => {
  if (!localStorage.getItem("auth_token")) return;
  trackQueue.push(featureName);
  if (!trackTimer) {
    trackTimer = setTimeout(() => {
      const features = [...trackQueue];
      trackQueue = [];
      trackTimer = null;
      features.forEach((name) => {
        api.post("/track", { feature_name: name }).catch(() => {
          // Silently ignore track failures — non-critical
        });
      });
    }, 300);
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────
export const analyticsAPI = {
  get: (params) => api.get("/analytics", { params }),
};

// ─── AI assistant ─────────────────────────────────────────────────────────
// Every OpenAI call happens on the backend. No key is ever present here.
//
// The global 15s timeout is right for analytics but far too short for a
// reasoning model, which regularly needs 15-30s. Chat gets its own budget,
// comfortably above the backend's own OpenAI timeout so the server's error
// surfaces rather than the browser giving up first.
const AI_CHAT_TIMEOUT = 90_000;

export const aiAPI = {
  status: () => api.get("/ai/status"),
  chat: (message, history) =>
    api.post("/ai/chat", { message, history }, { timeout: AI_CHAT_TIMEOUT }),
  demoRequest: (data) => api.post("/ai/demo-request", data),
  demoRequests: (params) => api.get("/ai/demo-requests", { params }),
};

/**
 * Authenticated dashboard analytics assistant. Separate endpoint and separate
 * concern from the public website assistant above.
 */
export const dashboardAI = {
  info: () => api.get("/ai/dashboard/info"),
};

/**
 * Streamed chat over server-sent events.
 *
 * axios buffers whole responses, so this uses fetch + ReadableStream directly.
 * onDelta receives text as it arrives; the promise resolves with
 * { demo_request_saved }. Throws on transport or upstream failure so the
 * caller can fall back to aiAPI.chat.
 */
export async function streamChat(message, history, onDelta, signal) {
  return streamSSE(`${BASE_URL}/ai/chat/stream`, { message, history }, onDelta, signal, false);
}

/**
 * Streamed analytics chat. Same SSE plumbing, but authenticated: the JWT is
 * what scopes the answer to the caller's organization.
 */
export async function streamDashboardChat(message, history, context, onDelta, signal) {
  return streamSSE(
    `${BASE_URL}/ai/dashboard/chat/stream`,
    { message, history, context },
    onDelta,
    signal,
    true
  );
}

async function streamSSE(url, body, onDelta, signal, authenticated) {
  const headers = { "Content-Type": "application/json" };
  if (authenticated) {
    const token = localStorage.getItem("auth_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const err = new Error("stream_failed");
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = { demo_request_saved: false };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      let event;
      try {
        event = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (event.type === "delta") onDelta(event.text);
      else if (event.type === "done") result = { demo_request_saved: !!event.demo_request_saved };
      else if (event.type === "error") throw new Error(event.detail || "stream_error");
    }
  }
  return result;
}
