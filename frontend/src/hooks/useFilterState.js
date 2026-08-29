import { useState, useCallback } from "react";
import Cookies from "js-cookie";

const COOKIE_KEY = "analytics_filters";
const COOKIE_EXPIRES = 30; // days

function loadFilters() {
  try {
    const raw = Cookies.get(COOKIE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const DEFAULT_FILTERS = {
  startDate: "",
  endDate: "",
  age: "",
  gender: "",
  selectedFeature: "",
};

export function useFilterState() {
  const [filters, setFiltersRaw] = useState(() => ({
    ...DEFAULT_FILTERS,
    ...(loadFilters() || {}),
  }));

  const setFilters = useCallback((updater) => {
    setFiltersRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      // Persist to cookie (minus selectedFeature which is ephemeral per-session)
      const { selectedFeature, ...toSave } = next;
      Cookies.set(COOKIE_KEY, JSON.stringify(toSave), { expires: COOKIE_EXPIRES });
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    Cookies.remove(COOKIE_KEY);
    setFiltersRaw(DEFAULT_FILTERS);
  }, []);

  return { filters, setFilters, resetFilters };
}
