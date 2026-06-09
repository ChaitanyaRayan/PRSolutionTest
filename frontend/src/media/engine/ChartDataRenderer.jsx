/**
 * ChartDataRenderer — Smart renderer for ALL items from interpret-charts.
 *
 * Handles the AI interpret-charts response format:
 * {
 *   charts: [
 *     {
 *       type: "area" | "bar" | "pie" | "line" | "kpi" | "table",
 *       series: [{ name: "Brand", values: [51, 55, 84, ...] }],
 *       labels: ["Jan", "Feb", "Mar", ...],
 *       meta:   { title: "...", unit: "...", period: "..." },
 *       insight: "AI-generated narrative text"
 *     }
 *   ]
 * }
 *
 * Also handles legacy flat format:  { data: [{name, value}] }
 * Rule: EVERY item returned is rendered. Nothing is dropped.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { DynamicChart, SERIES_COLORS } from './charts/DynamicChart';

// ── Palette ───────────────────────────────────────────────────────────────────
const DEFAULT_PALETTE = SERIES_COLORS;

function buildPalette(template) {
  if (!template?.palette?.length) return DEFAULT_PALETTE;
  return [...template.palette, ...DEFAULT_PALETTE];
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtLabel(k) {
  return String(k ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtNum(v) {
  if (typeof v !== 'number') return v;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString();
}

// ── Core data normaliser ──────────────────────────────────────────────────────
/**
 * Converts ANY chart item into a normalised shape:
 * {
 *   title:     string
 *   insight:   string | null
 *   chartType: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'kpi' | 'table'
 *   data:      [{name, ...keys}]   ← Recharts-ready rows
 *   seriesKeys: string[]           ← which keys to render
 *   unit:      string
 *   period:    string
 *   kpiValue:  any                 ← for kpi type only
 *   kpiDelta:  any
 * }
 */
function normaliseItem(item) {
  const title   = item.meta?.title ?? item.title ?? fmtLabel(item.label ?? '');
  const insight = item.insight ?? item.description ?? null;
  const unit    = item.meta?.unit ?? item.unit ?? '';
  const period  = item.meta?.period ?? item.period ?? '';

  // ── AI series+labels format ───────────────────────────────────────────────
  if (item.series && item.labels) {
    const series = item.series;
    const labels = item.labels;
    const type   = (item.type ?? '').toLowerCase();

    // Pie / donut — each series is a slice (single value)
    if (type === 'pie' || type === 'donut' || (series.length > 1 && series[0]?.values?.length === 1)) {
      const data = series.map((s) => ({ name: s.name, value: s.values?.[0] ?? 0 }));
      return { title, insight, chartType: 'donut', data, seriesKeys: ['value'], unit, period };
    }

    // Multi-series bar/line/area — pivot series×labels into rows
    const data = labels.map((label, i) => {
      const row = { name: label };
      series.forEach((s) => { row[s.name] = s.values?.[i] ?? 0; });
      return row;
    });
    const seriesKeys = series.map((s) => s.name);
    const chartType  = resolveChartType(type, data, seriesKeys);
    return { title, insight, chartType, data, seriesKeys, unit, period };
  }

  // ── KPI scalar ────────────────────────────────────────────────────────────
  const rawData = item.data;
  if (rawData === null || rawData === undefined || typeof rawData === 'number' || typeof rawData === 'string') {
    return { title, insight, chartType: 'kpi', data: [], seriesKeys: [],
             kpiValue: rawData ?? item.value ?? '—', kpiDelta: item.delta ?? item.change ?? null, unit };
  }
  if (typeof rawData === 'object' && !Array.isArray(rawData) && typeof rawData.value === 'number') {
    return { title, insight, chartType: 'kpi', data: [], seriesKeys: [],
             kpiValue: rawData.value, kpiDelta: rawData.delta ?? null, unit: rawData.unit ?? unit };
  }

  // ── Legacy flat array format ──────────────────────────────────────────────
  if (Array.isArray(rawData)) {
    if (!rawData.length) return { title, insight, chartType: 'kpi', data: [], seriesKeys: [], kpiValue: '—', unit };

    const first = rawData[0];
    if (typeof first !== 'object') {
      // Array of scalars → treat as kpi list
      return { title, insight, chartType: 'kpi', data: [], seriesKeys: [], kpiValue: rawData.join(', '), unit };
    }

    // Table hint
    const lbl = (item.label ?? '').toLowerCase();
    if (lbl.includes('table') || lbl.includes('enriched') || Object.keys(first).length > 5) {
      return { title, insight, chartType: 'table', data: rawData, seriesKeys: Object.keys(first), unit };
    }

    // Flat { name, value } → auto-type
    const numKeys = Object.keys(first).filter((k) => k !== 'name' && k !== 'label' && typeof first[k] === 'number');
    const nameKey = Object.keys(first).find((k) => /name|label|category|theme|topic|type|date|period|source/i.test(k)) ?? Object.keys(first)[0];
    const data    = rawData.map((r) => ({ ...r, name: r[nameKey] ?? r.name }));
    const type    = item.chart_type ?? item.type ?? '';
    const chartType = resolveChartType(type, data, numKeys);
    return { title, insight, chartType, data, seriesKeys: numKeys, unit };
  }

  return { title, insight, chartType: 'kpi', data: [], seriesKeys: [], kpiValue: '—', unit };
}

function resolveChartType(declared, data, keys) {
  if (declared) {
    const d = declared.toLowerCase();
    if (['bar', 'line', 'area', 'pie', 'donut', 'table', 'kpi'].includes(d)) return d;
  }
  if (!data?.length) return 'kpi';
  const first = data[0];
  // Time series
  if (/date|time|period|week|month|year|day/i.test(Object.keys(first).join(''))) {
    return data.length > 6 ? 'area' : 'line';
  }
  // Proportional
  if (keys.length === 1) {
    const total = data.reduce((s, r) => s + (Number(r[keys[0]] ?? 0)), 0);
    if (total >= 90 && total <= 110 && data.length <= 8) return 'donut';
  }
  return 'bar';
}

// ── Normalise top-level response ──────────────────────────────────────────────
function normaliseResponse(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw
    : Array.isArray(raw.charts) ? raw.charts
    : typeof raw === 'object' ? Object.entries(raw)
        .filter(([k, v]) => v && typeof v === 'object' && k !== 'chart_data')
        .map(([k, v]) => ({ label: k, ...v }))
    : [];
  return arr.map(normaliseItem);
}

// ── Chart components — all delegate to DynamicChart ──────────────────────────

// Map normalised chartType → DynamicChart chartType
function toDynamicType(chartType) {
  if (chartType === 'donut') return 'donut';
  if (chartType === 'pie')   return 'pie';
  return chartType; // bar, line, area, table, kpi pass through
}

function ChartWidget({ item, palette }) {
  const { data, seriesKeys, chartType } = item;
  if (!data?.length) return <div className="cdr-empty">No data available</div>;

  // Build widget shape expected by DynamicChart
  const widget = {
    id:           item.title ?? 'cdr',
    chartType:    toDynamicType(chartType),
    rawChartData: data,
    xKey:         'name',
    series:       seriesKeys.map((k, i) => ({
      key:   k,
      label: k,
      color: palette[i % palette.length],
    })),
  };

  return (
    <DynamicChart
      widget={widget}
      theme={{ chartPalette: palette }}
      height={260}
      dateInsights={item.dateInsights ?? []}
    />
  );
}

function TableWidget({ item }) {
  const { data, title } = item;
  if (!data?.length) return <div className="cdr-empty">No table data</div>;
  const cols = Object.keys(data[0]).filter((k) => !k.startsWith('_'));
  return (
    <div className="cdr-table-wrap">
      <table className="cdr-table">
        <thead>
          <tr>{cols.map((c) => <th key={c}>{fmtLabel(c)}</th>)}</tr>
        </thead>
        <tbody>
          {data.slice(0, 12).map((row, ri) => (
            <tr key={ri}>
              {cols.map((c) => (
                <td key={c} className={typeof row[c] === 'number' ? 'cdr-td-num' : ''}>
                  {row[c] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 12 && <p className="cdr-table-more">Showing 12 of {data.length} rows</p>}
    </div>
  );
}

function KpiCard({ item, tplPrimary }) {
  const { title, kpiValue, kpiDelta, unit, insight } = item;
  const isUp = kpiDelta && !String(kpiDelta).startsWith('-') && !String(kpiDelta).startsWith('−');
  return (
    <div className="cdr-kpi-card" style={{ borderTopColor: tplPrimary }}>
      <div className="cdr-kpi-value" style={{ color: tplPrimary }}>
        {typeof kpiValue === 'number' ? fmtNum(kpiValue) : kpiValue}
        {unit && <span className="cdr-kpi-unit"> {unit}</span>}
      </div>
      <div className="cdr-kpi-label">{title}</div>
      {kpiDelta && (
        <div className={`cdr-kpi-delta ${isUp ? 'cdr-kpi-delta--up' : 'cdr-kpi-delta--down'}`}>
          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {kpiDelta}
        </div>
      )}
      {insight && <p className="cdr-kpi-insight">{insight}</p>}
    </div>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────────────────
function ChartCard({ item, palette, tplPrimary, index }) {
  const { chartType, title, insight, data, period } = item;
  const isKpi      = chartType === 'kpi';
  const isFullWidth = chartType === 'table' || chartType === 'area' || chartType === 'line';

  if (isKpi) {
    return (
      <motion.div className="cdr-item cdr-item--kpi"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}>
        <KpiCard item={item} tplPrimary={tplPrimary} />
      </motion.div>
    );
  }

  return (
    <motion.div className={`cdr-item ${isFullWidth ? 'cdr-item--full' : ''}`}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}>
      <div className="cdr-card">
        <div className="cdr-card-header">
          <div>
            <h3 className="cdr-card-title">{title}</h3>
            {period && <span className="cdr-card-period">{period}</span>}
          </div>
          <span className="cdr-card-type-badge">{chartType}</span>
        </div>

        {insight && (
          <div className="cdr-insight-row">
            <Sparkles size={12} style={{ color: tplPrimary, flexShrink: 0, marginTop: 2 }} />
            <p className="cdr-card-insight" style={{ borderLeftColor: tplPrimary }}>{insight}</p>
          </div>
        )}

        <div className="cdr-chart-area">
          {chartType === 'table'
            ? <TableWidget item={item} />
            : data.length > 0
              ? <ChartWidget item={item} palette={palette} />
              : <div className="cdr-empty">No data available for this chart</div>
          }
        </div>
      </div>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ChartDataRenderer({ chartsData, template, title }) {
  const palette    = useMemo(() => buildPalette(template), [template]);
  const tplPrimary = template?.primaryColor ?? palette[0];
  const items      = useMemo(() => normaliseResponse(chartsData), [chartsData]);

  if (!items.length) {
    return <div className="cdr-empty-state"><p>No chart data available for this dashboard.</p></div>;
  }

  const kpis   = items.filter((it) => it.chartType === 'kpi');
  const charts = items.filter((it) => it.chartType !== 'kpi');

  return (
    <div className="cdr-root">
      {title && (
        <div className="cdr-section-header">
          <h2 className="cdr-section-title" style={{ color: tplPrimary }}>{title}</h2>
          <div className="cdr-section-line" style={{ background: tplPrimary }} />
        </div>
      )}

      {kpis.length > 0 && (
        <div className="cdr-kpi-strip">
          {kpis.map((item, i) => <ChartCard key={i} item={item} palette={palette} tplPrimary={tplPrimary} index={i} />)}
        </div>
      )}

      {charts.length > 0 && (
        <div className="cdr-charts-grid">
          {charts.map((item, i) => (
            <ChartCard key={item.title ?? i} item={item} palette={palette} tplPrimary={tplPrimary} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// Export normaliser for use in storyboard generation
export { normaliseResponse, normaliseItem };
