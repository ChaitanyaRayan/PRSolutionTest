import React from 'react';

/**
 * SkeletonLoader — animated placeholder for charts and cards during data fetching.
 * `variant`: 'chart' | 'card' | 'row' | 'tab'
 */
export function SkeletonLoader({ variant = 'chart', count = 1 }) {
  return (
    <div className={`mi-skeleton mi-skeleton--${variant}`} aria-busy="true" aria-label="Loading…">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mi-skeleton__item">
          {variant === 'chart' && (
            <>
              <div className="mi-skeleton__bar" style={{ width: '40%', height: 14, marginBottom: 8 }} />
              <div className="mi-skeleton__bar" style={{ width: '20%', height: 10, marginBottom: 20 }} />
              <div className="mi-skeleton__chart-area" />
            </>
          )}
          {variant === 'card' && (
            <>
              <div className="mi-skeleton__bar" style={{ width: '60%', height: 16, marginBottom: 10 }} />
              <div className="mi-skeleton__bar" style={{ width: '40%', height: 32, marginBottom: 6 }} />
              <div className="mi-skeleton__bar" style={{ width: '30%', height: 10 }} />
            </>
          )}
          {variant === 'row' && (
            <div className="mi-skeleton__bar" style={{ width: '100%', height: 38, marginBottom: 6 }} />
          )}
          {variant === 'tab' && (
            <div className="mi-skeleton__bar" style={{ width: 80, height: 30, borderRadius: 6 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div className="mi-skeleton mi-insight-skeleton">
      <div className="mi-skeleton__bar" style={{ width: '30%', height: 10, marginBottom: 8 }} />
      <div className="mi-skeleton__bar" style={{ width: '100%', height: 10, marginBottom: 5 }} />
      <div className="mi-skeleton__bar" style={{ width: '85%', height: 10, marginBottom: 5 }} />
      <div className="mi-skeleton__bar" style={{ width: '70%', height: 10 }} />
    </div>
  );
}
