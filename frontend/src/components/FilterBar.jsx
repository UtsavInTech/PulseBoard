import React from "react";
import { track } from "../api/client";
import styles from "./FilterBar.module.css";

const AGE_OPTIONS = [
  { value: "", label: "All Ages" },
  { value: "<18", label: "Under 18" },
  { value: "18-40", label: "18 – 40" },
  { value: ">40", label: "Over 40" },
];

const GENDER_OPTIONS = [
  { value: "", label: "All Genders" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function FilterBar({ filters, setFilters, onApply, loading }) {
  function handleDateChange(field, value) {
    setFilters((p) => ({ ...p, [field]: value }));
    track("date_filter");
  }

  function handleAgeChange(e) {
    setFilters((p) => ({ ...p, age: e.target.value }));
    track("age_filter");
  }

  function handleGenderChange(e) {
    setFilters((p) => ({ ...p, gender: e.target.value }));
    track("gender_filter");
  }

  function handleApply() {
    track("filter_apply");
    onApply();
  }

  function handleReset() {
    track("filter_reset");
    setFilters({
      startDate: "", endDate: "", age: "", gender: "", selectedFeature: "",
    });
    setTimeout(onApply, 0);
  }

  function quickRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFilters((p) => ({
      ...p,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }));
    track("date_filter");
  }

  return (
    <div className={styles.bar}>
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Date Range</span>
        <div className={styles.quickBtns}>
          {[
            { label: "7d", days: 7 },
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              type="button"
              className={styles.quickBtn}
              onClick={() => quickRange(days)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.dateRow}>
          <div className={styles.dateField}>
            <label className={styles.fieldLabel}>From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className={styles.input}
              max={filters.endDate || undefined}
            />
          </div>
          <div className={styles.dateSep}>→</div>
          <div className={styles.dateField}>
            <label className={styles.fieldLabel}>To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className={styles.input}
              min={filters.startDate || undefined}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Demographics</span>
        <div className={styles.selects}>
          <div className={styles.selectField}>
            <label className={styles.fieldLabel}>Age Group</label>
            <select
              value={filters.age}
              onChange={handleAgeChange}
              className={styles.select}
            >
              {AGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.selectField}>
            <label className={styles.fieldLabel}>Gender</label>
            <select
              value={filters.gender}
              onChange={handleGenderChange}
              className={styles.select}
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={handleReset}
          disabled={loading}
        >
          Reset
        </button>
        <button
          type="button"
          className={styles.applyBtn}
          onClick={handleApply}
          disabled={loading}
        >
          {loading ? "Loading…" : "Apply Filters"}
        </button>
      </div>
    </div>
  );
}
