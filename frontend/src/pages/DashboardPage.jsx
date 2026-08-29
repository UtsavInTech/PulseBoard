import React, { useCallback, useState } from "react";
import FilterBar from "../components/FilterBar";
import FeatureBarChart from "../components/FeatureBarChart";
import ClicksLineChart from "../components/ClicksLineChart";
import StatCard from "../components/StatCard";
import Funnel from "../components/Funnel";
import DemoRequests from "../components/DemoRequests";
import ComparisonTable from "../components/ComparisonTable";
import InfoPopover from "../components/InfoPopover";
import DashboardAssistant from "../components/DashboardAssistant";
import { useAuth } from "../context/AuthContext";
import { useAnalytics } from "../hooks/useAnalytics";
import { useFilterState } from "../hooks/useFilterState";
import { track, API_BASE_URL } from "../api/client";
import styles from "./DashboardPage.module.css";

function ChartCard({ title, subtitle, children, badge, info }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.chartTitle}>
            {title}
            {info && <InfoPopover title={title} {...info} />}
          </h2>
          {subtitle && <p className={styles.chartSub}>{subtitle}</p>}
        </div>
        {badge && <span className={styles.badge}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { auth } = useAuth();
  const [bookingCount, setBookingCount] = useState(null);
  const { filters, setFilters, resetFilters } = useFilterState();
  const { data, loading, error, refetch } = useAnalytics(filters);

  const handleFeatureSelect = useCallback(
    (featureName) => {
      track("bar_chart_click");
      setFilters((p) => ({ ...p, selectedFeature: featureName }));
    },
    [setFilters]
  );

  const handleApply = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleReset = useCallback(
    (next) => {
      resetFilters();
      setFilters(next);
    },
    [resetFilters, setFilters]
  );

  const uniqueFeatures = data?.bar_chart?.length ?? 0;
  const displayFeature = filters.selectedFeature || data?.selected_feature || "";

  // The dataset is shared across the company; the role decides which figures
  // the backend returns for it.
  const kpis = data?.kpis ?? [];
  const roleLabel = data?.role_label || auth?.user?.role_label || "Member";
  const role = data?.role || auth?.user?.role || "product_manager";
  const org = auth?.user?.organization;
  const product = auth?.user?.product;

  // Insights carry a tone computed by the backend. Splitting them turns a list
  // of observations into two decisions: fix this, keep doing that.
  const insights = data?.insights ?? [];
  const attention = insights.filter((i) => i.tone === "attention");
  const working = insights.filter((i) => i.tone !== "attention");

  const funnel = data?.funnel ?? [];
  const comparisons = data?.comparisons ?? [];
  const worstStep = funnel.length > 1
    ? funnel.slice(1).reduce((a, b) => (b.drop_off > a.drop_off ? b : a))
    : null;
  const weakest = comparisons.find((c) => c.tone === "attention");
  const strongest = comparisons.find((c) => c.tone === "positive");
  const dimension = (data?.comparison_columns?.[0] || "segment").toLowerCase();
  // "category" → "categories", not "categorys"
  const dimensionPlural = dimension.endsWith("y")
    ? `${dimension.slice(0, -1)}ies`
    : `${dimension}s`;

  return (
    <div className={styles.page} data-role={role}>
      {/* ── Role header: question first, numbers second ─────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>{roleLabel} View</h1>
            <span className={styles.roleBadge}>{roleLabel}</span>
          </div>
          <p className={styles.pageSubtitle}>
            {org ? (
              <>
                End-user behaviour for <strong>{product}</strong> at {org}.{" "}
                {data?.question}
              </>
            ) : (
              "End-user behaviour across your product."
            )}
          </p>
        </div>
        {loading && <div className={styles.spinner} aria-label="Loading" />}
      </div>

      {data?.can_learn?.length > 0 && (
        <div className={styles.learnStrip}>
          <span className={styles.learnLabel}>What you can learn here</span>
          <ul className={styles.learnList}>
            {data.can_learn.map((item) => (
              <li className={styles.learnItem} key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {data?.demo_notice && (
        <p className={styles.demoNotice}>
          <span className={styles.demoTag}>Demo</span>
          {data.demo_notice}
        </p>
      )}

      {/* ── Error banner ────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          ⚠ {error}
        </div>
      )}

      {/* ── Headline numbers for this role ──────────────────────────── */}
      <div className={styles.kpiGrid}>
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} color={k.tone} />
        ))}
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onApply={handleApply}
        loading={loading}
      />

      {/* ══ The decision layer — what to act on, before any chart ════ */}
      {insights.length > 0 && (
        <div className={styles.signalGrid}>
          <ChartCard
            title="What needs attention"
            subtitle="Findings computed from the current filters"
            badge={attention.length ? `${attention.length} to review` : "nothing flagged"}
            info={{
              what: "Findings the analysis flagged as working against you in the current date range and filters.",
              how: "Each line compares a segment or funnel step against the average across this dataset. A segment is flagged when it carries meaningful volume but converts at least 20% below that average.",
              why: "This is the shortlist. Rather than reading every chart, start here and use the cards below as evidence.",
              example: weakest
                ? `${weakest.label} is flagged because ${weakest.value.toLocaleString()} users reach it but only ${weakest.rate}% convert.`
                : "Nothing is currently below the flagging threshold for these filters.",
            }}
          >
            {attention.length ? (
              <ul className={styles.insights}>
                {attention.map((item) => (
                  <li className={`${styles.insight} ${styles.attention}`} key={item.text}>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptySignal}>
                No segment or funnel step is currently below the flagging threshold.
              </p>
            )}
          </ChartCard>

          {working.length > 0 && (
            <ChartCard
              title="What's working"
              subtitle="Patterns worth protecting or repeating"
              badge={`${working.length} signals`}
              info={{
                what: "Behaviours and segments performing at or above the average for this dataset.",
                how: "The same comparison as the panel on the left, inverted: segments converting at least 20% above average, plus period-over-period movement.",
                why: "Knowing what already works tells you what not to break, and which behaviour is worth encouraging elsewhere.",
                example: strongest
                  ? `${strongest.label} converts at ${strongest.rate}%, the strongest in this breakdown.`
                  : "No segment is currently above the flagging threshold for these filters.",
              }}
            >
              <ul className={styles.insights}>
                {working.map((item) => (
                  <li className={`${styles.insight} ${styles[item.tone] || ""}`} key={item.text}>
                    {item.text}
                  </li>
                ))}
              </ul>
            </ChartCard>
          )}
        </div>
      )}

      {/* ══ The evidence behind those signals ═══════════════════════ */}
      <div className={styles.chartsGrid}>
        {funnel.length > 0 && (
          <ChartCard
            title={data.funnel_title || "Funnel"}
            subtitle="Unique users reaching each stage"
            badge={`${funnel.length} stages`}
            info={{
              what: `Shows how unique users progress through the journey: ${funnel.map((f) => f.step).join(" → ")}.`,
              how: "Each stage counts users who completed it AND every stage before it, so the funnel can only narrow. The percentage on the right is conversion from the first stage; the red figure is the loss from the previous stage.",
              why: "It identifies exactly where users stop progressing, which is where a fix has the most leverage.",
              example: worstStep
                ? `The largest single loss is at “${worstStep.step}”, where ${worstStep.drop_off}% of the users who reached the previous stage do not continue.`
                : undefined,
            }}
          >
            <Funnel steps={funnel} />
          </ChartCard>
        )}

        {comparisons.length > 0 && (
          <ChartCard
            title={data.comparisons_title || "Breakdown"}
            subtitle="Volume against follow-through"
            badge={`${comparisons.length} ${dimensionPlural}`}
            info={{
              what: `Compares each ${dimension} on two things: how many users it brings, and how many of those go on to purchase.`,
              how: "Users are counted distinctly per stage, then conversion is the second column divided by the first. Amber marks a segment converting well below the average here; green marks one well above.",
              why: "Volume alone is misleading. A channel or category can dominate attention while contributing almost nothing — this is where you decide what to invest in or fix.",
              example: weakest && strongest
                ? `${weakest.label} converts at ${weakest.rate}% while ${strongest.label} reaches ${strongest.rate}% — a gap worth investigating.`
                : undefined,
            }}
          >
            <ComparisonTable columns={data.comparison_columns} rows={comparisons} />
          </ChartCard>
        )}

        {data?.sequences?.length > 0 && (
          <ChartCard
            title="Common Paths"
            subtitle="The routes users actually take"
            badge={`top ${data.sequences.length}`}
            info={{
              what: "The most frequent step-to-step transitions users make inside a single session.",
              how: "For every pair of consecutive events in the same session, the transition is counted. Only directly adjacent steps count, so this reflects real sequence rather than co-occurrence.",
              why: "Designed journeys and actual journeys differ. Repeated loops often signal users searching for something they cannot find.",
              example: data.sequences[0]
                ? `“${data.sequences[0].path}” is the most common transition, seen ${data.sequences[0].occurrences.toLocaleString()} times.`
                : undefined,
            }}
          >
            <div className={styles.sequences}>
              {data.sequences.map((seq) => (
                <div className={styles.sequence} key={seq.path}>
                  <span className={styles.sequencePath}>{seq.path}</span>
                  <span className={styles.sequenceCount}>{seq.occurrences.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}
      </div>

      {/* ══ Exploration — available, but not the headline ═══════════ */}
      <details className={styles.explore}>
        <summary className={styles.exploreSummary}>
          <span className={styles.exploreTitle}>Explore the raw event data</span>
          <span className={styles.exploreHint}>
            {uniqueFeatures} event types · click a bar to chart its daily trend
          </span>
        </summary>

        <div className={styles.chartsGrid}>
          <ChartCard
            title="Event Volume"
            subtitle="Every end-user event by type"
            badge={`${uniqueFeatures} types`}
          >
            <FeatureBarChart
              data={data?.bar_chart || []}
              selectedFeature={displayFeature}
              onFeatureSelect={handleFeatureSelect}
            />
          </ChartCard>

          <ChartCard
            title="Daily Trend"
            subtitle={
              displayFeature
                ? `Showing: ${displayFeature.replace(/_/g, " ")}`
                : "Select an event from the bar chart"
            }
            badge={data?.line_chart?.length ? `${data.line_chart.length} days` : null}
          >
            <ClicksLineChart data={data?.line_chart || []} featureName={displayFeature} />
          </ChartCard>
        </div>
      </details>

      {/* ══ Marketing leads — a different population entirely ═══════ */}
      <ChartCard
        title="Demo & Call Requests"
        subtitle="Prospects captured by the website assistant — not Meridian Shop users"
        badge={bookingCount === null ? null : `${bookingCount} total`}
        info={{
          what: "People who asked for a demo or call through the PulseBoard website assistant.",
          how: "The assistant captures name, email, phone and preferred time, validates them server-side, and stores them in a separate table.",
          why: "These are prospects for PulseBoard itself. They are deliberately kept apart from Meridian Shop's end-user analytics — mixing the two would corrupt both.",
        }}
      >
        <DemoRequests onCount={setBookingCount} />
      </ChartCard>

      {/* ── Analytics assistant — authenticated, role-aware ─────────── */}
      <DashboardAssistant filters={filters} />

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <p>
          PulseBoard · {org || "Demo"} · End-user data cached for 60 seconds ·{" "}
          <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
            API Docs ↗
          </a>
        </p>
      </footer>
    </div>
  );
}
