import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { track } from "../api/client";
import styles from "./Chart.module.css";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>{payload[0]?.value?.toLocaleString()} clicks</p>
    </div>
  );
};

export default function ClicksLineChart({ data = [], featureName }) {
  function handleMouseMove() {
    track("line_chart_hover");
  }

  if (!data.length) {
    return (
      <div className={styles.empty}>
        <span>Select a feature from the bar chart above</span>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.clicks), 1);
  const avg = Math.round(data.reduce((s, d) => s + d.clicks, 0) / (data.length || 1));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, max + 1]}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={avg}
          stroke="var(--warning)"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ value: `avg ${avg}`, fill: "var(--warning)", fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="var(--accent)"
          strokeWidth={2.5}
          fill="url(#lineGrad)"
          dot={data.length < 15 ? { fill: "var(--accent)", r: 3, strokeWidth: 0 } : false}
          activeDot={{ r: 5, fill: "var(--success)", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
