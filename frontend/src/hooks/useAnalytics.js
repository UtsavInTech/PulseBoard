import { useState, useEffect, useCallback } from "react";
import { analyticsAPI } from "../api/client";

export function useAnalytics(filters) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate)   params.end_date   = filters.endDate;
      if (filters.age)       params.age        = filters.age;
      if (filters.gender)    params.gender     = filters.gender;
      if (filters.selectedFeature) params.feature = filters.selectedFeature;

      const { data: res } = await analyticsAPI.get(params);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.age,
    filters.gender,
    filters.selectedFeature,
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
