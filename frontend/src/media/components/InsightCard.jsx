import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { InsightSkeleton } from './SkeletonLoader';
import { useBrandTheme } from '../context/BrandThemeContext';

/**
 * InsightCard — fire-and-forget agentic narration per chart.
 * Fetches narrative from the backend and renders it without blocking chart rendering.
 */
export function InsightCard({ dashboardId, tabId, chartData, brandName }) {
  const theme = useBrandTheme();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chartData) return;
    let cancelled = false;

    const fetchInsight = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/media/narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dashboardId,
            tabId,
            brandName,
            chartData,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setInsight(json.insight);
      } catch (err) {
        if (!cancelled) setError('Insight unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInsight();
    return () => { cancelled = true; };
  }, [dashboardId, tabId, chartData]);

  return (
    <motion.div
      className="mi-insight-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      style={{ borderLeftColor: theme.primaryColor }}
    >
      <div className="mi-insight-header">
        <span className="mi-insight-label" style={{ color: theme.primaryColor }}>
          AI Insight
        </span>
        <span className="mi-insight-dot" style={{ background: theme.primaryColor }} />
      </div>
      {loading ? (
        <InsightSkeleton />
      ) : error ? (
        <p className="mi-insight-error">{error}</p>
      ) : (
        <p className="mi-insight-text">{insight}</p>
      )}
    </motion.div>
  );
}
