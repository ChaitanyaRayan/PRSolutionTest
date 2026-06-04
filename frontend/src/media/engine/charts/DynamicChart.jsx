/**
 * DynamicChart — pure Recharts renderer driven entirely by config JSON.
 * The frontend NEVER transforms or calculates data — rawChartData comes from the API.
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const RADIAN = Math.PI / 180;

export function DynamicChart({ widget, theme, height = 220 }) {
  const { chartType, rawChartData = [], xKey = 'label', series = [], title } = widget;
  if (!rawChartData.length) return <ChartEmpty />;

  // Build tooltip style from theme
  const tooltipStyle = {
    backgroundColor: theme?.surfaceColor ?? '#fff',
    border: `1px solid rgba(0,0,0,0.1)`,
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    color: theme?.textColor ?? '#111',
  };

  const axisStyle = { fontSize: 11, fill: theme?.textMuted ?? '#9ca3af' };
  const gridColor = 'rgba(0,0,0,0.06)';

  // Infer series from rawChartData keys if not specified
  const activeSeries = series.length > 0 ? series : inferSeries(rawChartData, xKey, theme?.chartPalette);

  switch (chartType) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={rawChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            {activeSeries.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key}
                stroke={s.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: s.color }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rawChartData} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            {activeSeries.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key}
                fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={rawChartData}>
            <defs>
              {activeSeries.map((s, i) => (
                <linearGradient key={s.key} id={`ag-${widget.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            {activeSeries.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key}
                stroke={s.color} strokeWidth={2.5}
                fill={`url(#ag-${widget.id}-${i})`} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie': {
      const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.06) return null;
        const r = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{`${(percent * 100).toFixed(0)}%`}</text>;
      };
      const valueKey = activeSeries[0]?.key ?? 'value';
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={rawChartData} cx="50%" cy="50%" outerRadius={Math.floor(height * 0.38)}
              dataKey={valueKey} nameKey={xKey}
              labelLine={false} label={renderLabel}>
              {rawChartData.map((_, i) => (
                <Cell key={i} fill={(theme?.chartPalette ?? [])[i % 5] ?? activeSeries[0]?.color ?? '#7C3AED'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case 'radialBar': {
      const valueKey = activeSeries[0]?.key ?? 'value';
      const radData = rawChartData.map((d, i) => ({
        ...d,
        fill: (theme?.chartPalette ?? [])[i % 5] ?? activeSeries[0]?.color ?? '#7C3AED',
      }));
      return (
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart cx="50%" cy="50%" innerRadius={28} outerRadius={Math.floor(height * 0.42)}
            data={radData} startAngle={180} endAngle={-180}>
            <RadialBar minAngle={12} background={{ fill: 'rgba(0,0,0,0.04)' }}
              dataKey={valueKey} cornerRadius={5} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadialBarChart>
        </ResponsiveContainer>
      );
    }

    case 'lollipop': {
      // Custom lollipop rendered as a specialised BarChart with thin bars + dot markers
      const valueKey = activeSeries[0]?.key ?? 'value';
      const color = activeSeries[0]?.color ?? theme?.primaryColor ?? '#7C3AED';
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rawChartData} layout="vertical" barSize={3}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} width={90} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey={valueKey} fill={color} radius={[0, 6, 6, 0]}
              label={{ position: 'right', fontSize: 11, fill: theme?.textMuted ?? '#9ca3af' }} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    default:
      return <ChartEmpty type={chartType} />;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function inferSeries(data, xKey, palette = []) {
  if (!data?.[0]) return [];
  const DEFAULT_PALETTE = ['#7C3AED', '#EC4899', '#3DD9D6', '#F59E0B', '#A78BFA'];
  const colors = palette.length ? palette : DEFAULT_PALETTE;
  const keys = Object.keys(data[0]).filter((k) => k !== xKey && typeof data[0][k] === 'number');
  return keys.map((k, i) => ({ key: k, label: k, color: colors[i % colors.length] }));
}

function ChartEmpty({ type }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--eng-text-muted, #9ca3af)', fontSize: 12, flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 22 }}>📊</span>
      <span>{type ? `Chart type "${type}" — no data` : 'No chart data'}</span>
    </div>
  );
}
