import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { track } from "../api/client";
import styles from "./Chart.module.css";

const COLORS = ["#123452", "#2563EB", "#0F9F9A", "#1B4670", "#3B82F6", "#16C784", "#0B1F33", "#38BDF8"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{payload[0]?.payload?.feature_name}</p>
      <p className={styles.tooltipValue}>{payload[0]?.value?.toLocaleString()} clicks</p>
    </div>
  );
};

export default function FeatureBarChart({ data = [], selectedFeature, onFeatureSelect }) {
  function handleBarClick(entry) {
    if (!entry?.feature_name) return;
    track("bar_chart_click");
    onFeatureSelect(entry.feature_name);
  }

  if (!data.length) {
    return (
      <div className={styles.empty}>
        <span>No data for this time range</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
        barCategoryGap="28%"
        onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0]?.payload)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="feature_name"
          width={110}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.replace(/_/g, " ")}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
        <Bar dataKey="total_clicks" radius={[0, 6, 6, 0]} cursor="pointer">
          {data.map((entry, i) => (
            <Cell
              key={entry.feature_name}
              fill={
                entry.feature_name === selectedFeature
                  ? "var(--success)"
                  : COLORS[i % COLORS.length]
              }
              opacity={
                selectedFeature && entry.feature_name !== selectedFeature ? 0.45 : 1
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
