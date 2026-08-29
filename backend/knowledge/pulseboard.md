# PulseBoard — Product Knowledge Base

This file is the assistant's source of truth. Everything here is verified
against the running prototype. If a question is not answered here, the
assistant must say it does not know rather than invent an answer.

## What PulseBoard is

PulseBoard is a behavioral analytics platform. A company's end-user activity is
collected into one shared data layer and presented as useful insights for
Product, Growth, Research and Executive teams.

Positioning: Real-Time Behavioral Intelligence.

## Current stage — important

PulseBoard is a **working prototype**, not a production system. It currently
provides:

- Event tracking
- Product analytics
- User behavior visualization
- Feature usage analysis
- Trends over time
- Demographic filtering (age bracket, gender)
- An interactive dashboard with funnels, segments and journey paths

It does **not** currently provide: fraud detection, AI/ML models, predictive
scoring, billing, an external SDK, real-time streaming infrastructure
(Kafka/ClickHouse), or calendar integrations. Those are future direction only.

Production deployment would still require work on scalability, privacy,
security, monitoring, data governance and reliability.

## The two user types — the core concept

**PulseBoard users** are employees of the company using PulseBoard: Product
Managers, Growth Managers, User Researchers and Executives. They sign in to
PulseBoard to understand what is happening inside their product. They ANALYSE.

**End users** are the actual people using that company's website or
application. Their interactions generate the events PulseBoard analyses. They
GENERATE.

The model is: ONE COMPANY → ONE PRODUCT → ONE END-USER DATASET → ROLE-SPECIFIC
VIEWS. A role is a lens on shared data, not a separate dataset and not a
permission system. An employee's own dashboard clicks are stored separately
(member activity) and never contaminate the end-user data they analyse.

## The four roles

**Product Manager** — "What are users using, what are they ignoring, and where
do they drop off?" Sees: Active Users, Sessions, Feature Adoption, Least Used
Feature, and the product funnel (viewed product → added to cart → started
checkout → purchased) with drop-off at each step.

**Growth Manager** — "Where do users come from, do they activate, convert, and
come back?" Sees: New Users, Activated %, Converted %, Returning %, the growth
funnel (signed up → activated → engaged → converted), and an acquisition source
breakdown (Organic Search, Paid Social, Referral, Direct, Email).

**User Researcher** — "How do users actually behave, and where do they
struggle?" Sees: Sessions Observed, Events per Session, Repeated Actions,
Biggest Friction point, the funnel, and the most common step-to-step paths
users take within a session.

**Executive** — "What is happening across the product overall?" A combined
read of the same data: Active Users, Engagement, Conversion, Retention, the
funnel, plus key signals summarised from Product, Growth and Research. It is
an aggregated view, not another dataset.

## How the demo works

The demo company is **Meridian Retail**, a fictional online marketplace, with a
product called **Meridian Shop**. It has around 260 synthetic end users
generating roughly 5,000 events over 60 days.

All demo data is SYNTHETIC and generated for demonstration purposes. It is
modelled on real-world e-commerce behaviour but is not any real company's data.

The synthetic journey covers: session started, homepage viewed, search,
category viewed, product viewed, review viewed, wishlist added, add to cart,
cart viewed, checkout started, address added, payment attempted, purchase
completed — plus realistic negative paths: payment failed, cart abandoned,
checkout abandoned, order cancelled.

The data contains deliberate patterns the dashboards surface, for example:
Electronics attracts the most product views but converts below the marketplace
average; desktop completes checkout more often than mobile; Paid Social brings
volume with weak conversion while Email and Referral convert well; users who
read reviews add to cart more often; returning users convert better than
first-time visitors.

Four demo accounts, all employees of Meridian Retail, all password
`password123`:

- `utsav`  — Product Manager
- `utsav1` — Growth Manager
- `utsav2` — User Researcher
- `utsav3` — Executive

All four read exactly the same event dataset. Signing into each shows how the
same data answers different questions.

## How PulseBoard works, step by step

1. **Capture** — PulseBoard collects meaningful events from the company's
   website or application.
2. **Understand** — Events are organised into users, sessions, journeys and
   behavioural patterns.
3. **Analyze** — PulseBoard identifies trends, frequently used features,
   drop-offs and unusual activity.
4. **Act** — Teams use these insights to improve products, personalise
   experiences and respond to important changes.

## Who it is for

Teams that need to understand product behaviour: e-commerce, SaaS and digital
products. Banking and FinTech are a stated long-term direction — PulseBoard
does not currently do risk or fraud detection.

## How a real company would connect

Today the demo runs on synthetic seeded events. In production the same pipeline
would carry real events:

your website or app → a PulseBoard tracking call → event ingestion → event
storage → analytics → the role dashboards.

Conceptually a customer would send events like:

  pulseboard.track("product_view", { product_id: "P123", category: "electronics" })

A packaged SDK does not exist yet — this is the intended integration shape, not
a shipped product.

## Technology

React + Vite frontend, FastAPI backend, PostgreSQL, Redis caching, JWT
authentication, Docker. Charts use Recharts.

## Contact

PulseBoard is built by Utsav, Founder & Developer.
Email: utsav.udk@gmail.com
LinkedIn: https://www.linkedin.com/in/utsav-tech/
WhatsApp: 6200842008
