import { useState, useEffect, useCallback } from 'react';
import { useMediaStore } from '../store/mediaStore';

/**
 * useChartData — fetches chart data for a given dashboard + tab combination.
 * Data normalisation lives here; chart components receive clean { series, labels, meta }.
 * Results are cached in the Zustand store to avoid redundant requests.
 */
export function useChartData(dashboardId, tabId) {
  const getChartData = useMediaStore((s) => s.getChartData);
  const setChartData = useMediaStore((s) => s.setChartData);
  const confirmedData = useMediaStore((s) => s.confirmedData);
  const brandName = useMediaStore((s) => s.brandName);

  const cached = getChartData(dashboardId, tabId);

  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/chart-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId,
          tabId,
          brandName,
          sampleData: confirmedData?.slice(0, 20) ?? [],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Normalise: ensure series, labels, meta always present
      const normalised = {
        series: json.series ?? [],
        labels: json.labels ?? [],
        meta: {
          title: json.meta?.title ?? `${dashboardId} — ${tabId}`,
          unit: json.meta?.unit ?? '',
          period: json.meta?.period ?? 'Last 30 days',
        },
      };
      setChartData(dashboardId, tabId, normalised);
      setData(normalised);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dashboardId, tabId, brandName, confirmedData]);

  useEffect(() => {
    if (!cached) fetchData();
  }, [dashboardId, tabId]);

  return { data, loading, error, refetch: fetchData };
}
