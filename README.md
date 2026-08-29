# PulseBoard

**A behavioral analytics platform that turns end-user activity from a digital product into role-specific insights for Product, Growth, Research and Executive teams.**

> **Demo environment** — all users, events and metrics in this repository are **synthetic data generated for demonstration**. Meridian Retail is a fictional company. This is not any real company's data.

---

## What PulseBoard is

A company runs a digital product. Its users click, search, browse, abandon carts and occasionally buy. PulseBoard collects those interactions as events, stores them as one shared dataset per company, and presents that same dataset through four different lenses — because a Product Manager, a Growth Manager, a User Researcher and an Executive are asking genuinely different questions about the same reality.

It also ships an **authenticated AI Analytics Assistant** that answers questions in natural language by querying that data, not by guessing.

PulseBoard is a **working prototype**. It does event tracking, product analytics, behavioural visualisation, funnels, segmentation and role-aware insight generation. It does not do fraud detection, predictive ML, billing, or real-time streaming infrastructure — see [Limitations](#current-limitations).

---

## The core product model

The single most important idea in this codebase: **two populations that must never be conflated.**

```
Organization  (e.g. Meridian Retail)
│
├── PulseBoard employees  ──►  they ANALYSE
│     ├── Product Manager
│     ├── Growth Manager
│     ├── User Researcher
│     └── Executive
│
└── End users             ──►  they GENERATE
      └── Events  (session_started, product_viewed, add_to_cart, purchase_completed, …)
```

- **PulseBoard employees** sign in. They have a name, a work email, a role and an organization. They have **no age or gender** — those describe end users, and mixing them was a real bug in this project's history.
- **End users** never sign in. They are the customers of the company's product. Their age, gender, device, acquisition source and behaviour are what gets analysed.
- **One company → one product → one event dataset → four role perspectives.** A role is a lens, not a data boundary and not a permission system. All four demo accounts return an identical `total_events`; a test enforces it.

A third, separate population: **marketing leads** (`demo_requests`) — people who asked for a demo through the public website. They are prospects for PulseBoard itself and are deliberately kept out of the product analytics.

---

## The demo dataset

`backend/seed.py` generates a synthetic online marketplace — **Meridian Retail**, product **Meridian Shop**: 260 end users, ~4,800 events over 60 days, following a realistic journey:

```
session_started → homepage_viewed → search → category_viewed → product_viewed
→ review_viewed → wishlist_added → add_to_cart → cart_viewed → checkout_started
→ address_added → payment_attempted → purchase_completed
```

plus the negative paths that make analytics worth doing: `cart_abandoned`, `checkout_abandoned`, `payment_failed`, `order_cancelled`.

The generator plants **correlations to discover** rather than drawing independent random numbers:

| Planted pattern | Actual figure in the seeded data |
|---|---|
| Electronics: high views, weak conversion | 88 viewers, **13.6%** convert |
| Beauty / Home & Kitchen convert well | **35.8%** / **31.2%** |
| Mobile abandons checkout more than desktop | desktop **84.9%** completion vs mobile **72.7%** |
| Paid Social brings volume, not buyers | **17.2%** vs Referral's **31.2%** |
| Review readers add to cart more | **71.5%** vs **28.2%** |
| Payment failures cause real loss | ~12% of payment attempts |

Every number on the dashboard and every AI answer is computed from this data at request time. Nothing is hardcoded in React.

---

## Role-based dashboards

Each dashboard reads top to bottom as a decision path, not a chart gallery:

| Order | Section | Question it answers |
|---|---|---|
| 1 | Role header + *What you can learn here* | "What is this view for?" |
| 2 | KPI cards | "What are the headline numbers?" |
| 3 | Filters | "For which slice of users?" |
| 4 | **What needs attention** / **What's working** | "What should I act on?" |
| 5 | Funnel + breakdown table | "What is the evidence?" |
| 6 | *Explore the raw event data* (collapsed) | "Let me dig further" |
| 7 | Demo & Call Requests | PulseBoard's own leads |

| Role | Sees | Accent |
|---|---|---|
| **Product Manager** | Category performance, marketplace funnel, add-to-cart and checkout rates, least-used features | violet |
| **Growth Manager** | Acquisition channels and their quality, activation, conversion, returning users, growth funnel | green |
| **User Researcher** | Common paths, session depth, repeated actions, abandonment, friction by device | teal |
| **Executive** | Four health numbers, the biggest funnel leak, channel quality, cross-role signals | blue |

Every analytics card carries an **info popover** answering four fixed questions — what it shows, how it's calculated, why it matters, and a worked example using live values.

**Funnels are progressive intersections**: each stage counts users who completed it *and* every prior stage, so the funnel can only narrow. Counting stages independently once produced an "Engaged 106.2%" step.

---

## AI Analytics Assistant

PulseBoard has **two separate AI systems**. They share an OpenAI integration and streaming plumbing, and nothing else.

| | Public website assistant | Dashboard analytics assistant |
|---|---|---|
| Where | Marketing site (`/`, `/about`, …) | Inside `/dashboard`, signed in |
| Auth | None | **JWT required** |
| Answers from | `backend/knowledge/*.md` | **Live organization event data** |
| Does | Product Q&A, demo/call capture, email & LinkedIn drafts | Analytical questions, role-aware |
| Endpoints | `/ai/chat`, `/ai/chat/stream` | `/ai/dashboard/info`, `/ai/dashboard/chat/stream` |

### How the dashboard assistant works

```
Employee asks a question
        ↓
FastAPI  /ai/dashboard/chat/stream   (JWT → user → organization)
        ↓
OpenAI Responses API  +  4 analytics tools
        ↓
compute_analytics()  ← the SAME engine behind the dashboard
        ↓
PostgreSQL
        ↓
Grounded, streamed answer
```

The model may call four tools, all scoped to the caller's organization:

| Tool | Purpose |
|---|---|
| `get_analytics_summary` | KPIs, funnel, breakdown, computed insights — delegates to `compute_analytics` |
| `get_daily_activity` | Daily counts with weekday names, plus a server-computed weekend/weekday split |
| `get_breakdown` | Volume and conversion by category, device, browser or acquisition source |
| `get_common_paths` | Session transitions, depth, repeated actions, abandonment |

**Role changes the lens, not the data.** Each role gets a different system prompt and different starter questions; all four query the same tables.

### The model never chooses the date range

This is enforced structurally, not by instruction. **No tool exposes a date or
demographic parameter.** The window comes from the dashboard the user is looking
at, sent as trusted application state and resolved server-side, so the
assistant's figures always match their screen.

To read a different span the model passes a `period` the server resolves:

| `period` | Resolves to |
|---|---|
| `dashboard` *(default)* | Exactly the range the user has selected |
| `previous_period` | The equal-length span immediately before it |
| `this_week` / `last_week` | Monday-to-Sunday weeks |
| `this_month` / `last_month` | Calendar months |

Every result carries `window_used`, so the model can tell the user which span a
figure covers. Dates, demographics or an `organization_id` sent by the model are
discarded and reported back to it as ignored. Weekend/weekday is computed in SQL
with correct distinct counts, because daily user counts cannot be summed.

### Grounding rules

The assistant is instructed to never invent numbers, to separate *what the data shows* from *possible interpretation*, to cite the counts behind a rate, and to flag small samples. If the tools cannot answer, it says so.

Real answers from the seeded data:

> **Product Manager** — "Electronics should be investigated: lowest conversion at 13.6% despite the highest reach (88 users), well below the 24.6% category average. Beauty and Grocery convert more than twice as well."

> **Growth Manager** — "This past weekend saw 24 distinct users versus 25 the weekend before; 229 events versus 236. Slightly down week-over-week."

### Security model

- The OpenAI key is **server-side only**, read from a gitignored `.env`. It never reaches React and is never logged.
- Both dashboard endpoints require a valid JWT.
- **Organization scope comes from the authenticated user**, never from the request body. There is no organization parameter to supply.
- **Tool arguments are treated as untrusted model output** and sanitised. A degenerate generation once emitted a corrupted `end_date` and invented demographic filters that silently narrowed the dataset — malformed values are now dropped, and the model has no age/gender parameters at all. Demographic filters come from the user's own dashboard state.

---

## Architecture

```
                       React + Vite  (SPA)
                              │
                       ┌──────┴───────┐
                  public site     /dashboard  (RequireAuth)
                              │
                              ▼
                      FastAPI  (Uvicorn)
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
      JWT auth (bcrypt)   analytics       AI routers
                          service              │
                              │         ┌──────┴──────┐
                              │     public KB    dashboard tools
                              │                       │
                              ▼                       ▼
                        PostgreSQL  ◄─────────────────┘
                              │
                        Redis (60s analytics cache)
```

---

## Real-world integration

**Today** the demo runs on synthetic seeded events. **In production** the same pipeline would carry real ones:

```
Customer website / app
        ↓
PulseBoard tracking call
        ↓
Event ingestion
        ↓
Event storage  (PostgreSQL)
        ↓
Analytics engine  (compute_analytics)
        ↓
Role dashboards + AI Analytics Assistant
```

Conceptually a customer would send:

```js
pulseboard.track("product_view", { product_id: "P123", category: "electronics" });
```

**A packaged SDK does not exist.** That is the intended integration shape, not a shipped product. Everything downstream of ingestion is real and working.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, CSS Modules, Recharts |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2, Uvicorn |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (python-jose) + bcrypt |
| AI | OpenAI Responses API (`gpt-4.1` by default) |
| Infrastructure | Docker Compose, nginx |

No animation library, no component library, no state-management library.

---

## Local development

### Prerequisites

- Docker Desktop (running)
- Node.js 20+
- Python 3.11+ *(only if running the backend outside Docker)*

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/PulseBoard.git
cd PulseBoard
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum `SECRET_KEY`, plus `OPENAI_API_KEY` if you want either assistant. Both work without it — the app boots, `/ai/status` reports `available: false`, and the assistants hide themselves.

### 3. Start the backend stack

```bash
docker compose up -d postgres redis backend
```

### 4. Seed the demo data

```bash
docker compose --profile seed run --rm seeder
```

Creates the organization, four employees, 260 end users and ~4,800 events. Safe to re-run — it clears and regenerates the demo data.

### 5. Start the frontend

```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**.

> Port 5173 matters: the backend's `CORS_ORIGINS` lists it explicitly.

### Everyday commands

```bash
docker compose stop                      # stop containers, keep data
docker compose up -d postgres redis backend   # start again
docker compose logs -f backend           # follow backend logs
docker ps --format "{{.Names}} — {{.Status}}"  # what's running
```

Reset the database completely (**destroys all data**):

```bash
docker compose down -v && docker compose up -d postgres redis backend && docker compose --profile seed run --rm seeder
```

### Tests

```bash
docker compose run --rm --entrypoint sh backend -c "pip install -q pytest pytest-asyncio httpx && python -m pytest tests -v"
```

### Production build

```bash
cd frontend && npm run build
```

### API documentation

Swagger UI at **http://localhost:8000/docs** while the backend is running.

---

## Environment variables

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials |
| `SECRET_KEY` | JWT signing key — **change for any real deployment** |
| `VITE_API_URL` | Backend URL as the browser sees it |
| `OPENAI_API_KEY` | Server-side only. Optional; both assistants disable themselves without it |
| `OPENAI_MODEL` | Defaults to `gpt-4.1` |
| `OPENAI_REASONING_EFFORT` | Only sent for reasoning models (`gpt-5`, `o1`, `o3`, `o4`) |

> ⚠️ **Never commit `.env`.** It is gitignored, and `.env.example` holds placeholders only. If a key is ever pasted into a chat, an issue, or a commit, **rotate it immediately** — treat it as public from that moment.

---

## Demo credentials

All four accounts use `password123` and belong to **Meridian Retail**, reading the **same** dataset.

| Username | Employee | Role |
|---|---|---|
| `utsav` | Utsav Kumar | Product Manager |
| `utsav1` | Utsav Verma | Growth Manager |
| `utsav2` | Utsav Rao | User Researcher |
| `utsav3` | Utsav Sharma | Executive |

Sign in at `/login`, or use the demo cards on the home page.

---

## Project structure

```
PulseBoard/
├── backend/
│   ├── app/
│   │   ├── main.py              # App factory, CORS, rate limiting, logging
│   │   ├── config.py            # Pydantic settings from environment
│   │   ├── database.py          # Engine, session, additive schema sync
│   │   ├── models.py            # Organization, User, EndUser, Event, …
│   │   ├── schemas.py           # Request/response contracts
│   │   ├── auth.py              # JWT + bcrypt
│   │   ├── ai/
│   │   │   ├── assistant.py            # Public website assistant
│   │   │   ├── knowledge.py            # Loads backend/knowledge/
│   │   │   ├── dashboard_assistant.py  # Role-aware analytics assistant
│   │   │   └── analytics_tools.py      # The 4 org-scoped tools
│   │   └── routers/
│   │       ├── auth_router.py   # /register, /login
│   │       ├── track.py         # /track (member telemetry)
│   │       ├── analytics.py     # compute_analytics + /analytics
│   │       └── ai.py            # Public + dashboard AI endpoints
│   ├── knowledge/               # Assistant grounding documents
│   ├── tests/test_api.py        # 60 tests
│   └── seed.py                  # Synthetic marketplace generator
├── frontend/
│   └── src/
│       ├── components/          # Shared UI + marketing/ subfolder
│       ├── pages/               # Home, About, Solutions, Careers, Contact,
│       │                        # FAQ, Login, Dashboard, Profile
│       ├── context/AuthContext.jsx
│       ├── api/client.js        # axios + SSE helpers
│       └── styles/
└── docker-compose.yml
```

---

## Contributing

1. **Fork** the repository and clone your fork.
2. **Branch**: `git checkout -b feature/your-change`
3. **Set up** following [Local development](#local-development).
4. **Run the tests first** so you know they pass before your change.
5. **Make your change.** Match the surrounding style — the codebase uses CSS Modules, no CSS framework, and explanatory comments only where the *why* is non-obvious.
6. **Verify**:
   ```bash
   docker compose run --rm --entrypoint sh backend -c "pip install -q pytest pytest-asyncio httpx && python -m pytest tests -q"
   cd frontend && npm run build
   ```
7. **Check Docker still starts** from scratch: `docker compose down && docker compose up -d postgres redis backend`
8. **Commit** with a message describing *why*, not just what.
9. **Open a pull request** describing the change, how you tested it, and any limitation you knowingly left.

If you add analytics, add a test asserting the numbers behave (funnels narrow, rates stay within 0–100, roles read the same dataset). Silent analytics bugs are the expensive kind.

---

## Current limitations

Honest list of what this **does not** do:

- **No production SDK.** The tracking integration is conceptual; events are seeded.
- **No real-time streaming.** No Kafka, no ClickHouse. Events are written directly to PostgreSQL.
- **No fraud detection, no predictive ML, no behavioural scoring.**
- **No billing, no calendar integration, no email delivery.** Demo requests are stored and read in the dashboard; nothing is sent.
- **No migration tool.** `ensure_schema()` applies additive columns and constraint relaxations only. Anything more needs Alembic.
- **No RBAC.** A role changes the analytical perspective, not permissions — every member of an organization can read all of its data.
- **Single-tenant demo data.** Multi-organization isolation is enforced and tested, but only one organization is seeded.
- **The AI can be wrong.** It is grounded in real queries and instructed not to invent, but it is a language model interpreting results. Treat its answers as a starting point.

### Possible future directions

Real-time ingestion, a packaged SDK, anomaly detection, cohort retention, predictive insights, and risk intelligence for financial use cases. None of these exist today.

---

## Contact

Built by **Utsav** — Founder & Developer.

- Email: utsav.udk@gmail.com
- LinkedIn: [/in/utsav-tech](https://www.linkedin.com/in/utsav-tech/)

---

_PulseBoard · Built by Utsav · 2026_
