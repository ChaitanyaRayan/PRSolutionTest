/**
 * DynamicChart — pixel-matches screenshot designs.
 *
 * Chart types:
 *   line / area      — purple+pink lines, ✦ star spike markers above peaks,
 *                      hover tooltip: date bold + series rows with color dots,
 *                      spike popup: date · count · AI summary · "AI Generated" tag
 *   donut            — thick ring, center total + label, left legend table
 *   pie              — full pie (sentiment: green/red/gray), left legend table
 *   sov              — same as pie but multi-color
 *   horizontal-bar   — blue gradient bars, right-aligned labels, hover tooltip
 *   sentiment-bar    — horizontal stacked green/red/gray bars per source
 *   stacked-bar      — vertical stacked % bar (message congruence)
 *   bar              — vertical bars with gradient fills
 *   wordcloud        — CSS word cloud
 *   radialBar        — radial score tracker
 *   lollipop         — horizontal lollipop
 */

import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar, LabelList,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine,
} from 'recharts';

const RADIAN = Math.PI / 180;

/* ── 10-hue × 10-variant palette ─────────────────────────────────────────── */
export const PALETTE = {
  magenta: ['#FDF2FA','#FCE7F8','#F9D0F3','#F5A8E9','#EE72D8','#E040C8','#C726AB','#A21B8E','#851972','#611456'],
  purple:  ['#F5F3FF','#EDE9FE','#DDD6FE','#C4B5FD','#A78BFA','#8B5CF6','#7C3AED','#6D28D9','#5B21B6','#4C1D95'],
  blue:    ['#EFF6FF','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#2563EB','#1D4ED8','#1E40AF','#1E3A8A'],
  cyan:    ['#ECFEFF','#CFFAFE','#A5F3FC','#67E8F9','#22D3EE','#06B6D4','#0891B2','#0E7490','#155E75','#164E63'],
  teal:    ['#F0FDFA','#CCFBF1','#99F6E4','#5EEAD4','#2DD4BF','#14B8A6','#0D9488','#0F766E','#115E59','#134E4A'],
  green:   ['#F0FDF4','#DCFCE7','#BBF7D0','#86EFAC','#4ADE80','#22C55E','#16A34A','#15803D','#166534','#14532D'],
  yellow:  ['#FEFCE8','#FEF9C3','#FEF08A','#FDE047','#FACC15','#EAB308','#CA8A04','#A16207','#854D0E','#713F12'],
  orange:  ['#FFF7ED','#FFEDD5','#FED7AA','#FDBA74','#FB923C','#F97316','#EA580C','#C2410C','#9A3412','#7C2D12'],
  red:     ['#FFF1F2','#FFE4E6','#FECDD3','#FDA4AF','#FB7185','#F43F5E','#E11D48','#BE123C','#9F1239','#881337'],
  gray:    ['#F9FAFB','#F3F4F6','#E5E7EB','#D1D5DB','#9CA3AF','#6B7280','#4B5563','#374151','#1F2937','#111827'],
};

export const SERIES_COLORS = [
  '#8B5CF6', '#3B82F6', '#14B8A6', '#EE72D8',
  '#F97316', '#06B6D4', '#22C55E', '#EAB308',
  '#F43F5E', '#6B7280',
];

export const SENT_COLORS = {
  POS: '#16A34A', NEG: '#F43F5E', NEU: '#9CA3AF',
  Positive: '#16A34A', Negative: '#F43F5E', Neutral: '#9CA3AF',
  positive: '#16A34A', negative: '#F43F5E', neutral: '#9CA3AF',
};
const isSent = (k) => !!SENT_COLORS[k];
const sentColor = (k) => SENT_COLORS[k] ?? SERIES_COLORS[0];

/* ── Shared styles ────────────────────────────────────────────────────────── */
const TS = {
  backgroundColor: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
  fontSize: 12,
  padding: '10px 14px',
  fontFamily: 'DM Sans, system-ui, sans-serif',
};
const AX = { fontSize: 11, fill: '#B0B5C8', fontFamily: 'DM Sans, system-ui, sans-serif' };
const GC = 'rgba(0,0,0,0.04)';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function inferSeries(data, xKey, palette = SERIES_COLORS) {
  if (!data?.[0]) return [];
  return Object.keys(data[0])
    .filter(k => k !== xKey && typeof data[0][k] === 'number')
    .map((k, i) => ({
      key: k, label: k,
      color: isSent(k) ? sentColor(k) : palette[i % palette.length],
    }));
}

function fmtNum(v) {
  if (typeof v !== 'number') return v;
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
}

/* ── Custom line/area tooltip — matches screenshot exactly ───────────────── */
function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
      padding: '12px 16px', minWidth: 150,
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ marginBottom: i < payload.length - 1 ? 8 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: p.color, marginBottom: 2 }}>{p.name}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#111827', lineHeight: 1, fontFamily: 'DM Sans, sans-serif' }}>
            {p.value?.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Custom horizontal-bar tooltip ───────────────────────────────────────── */
function HBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const color = PALETTE.blue[6];
  return (
    <div style={{ ...TS, minWidth: 120 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
        {payload[0]?.value?.toLocaleString()}
      </div>
    </div>
  );
}

/* ── Spike dot — premium star badge + portal tooltip ─────────────────────── */
function SpikeDot({ cx, cy, payload, xKey, spikeMap, color }) {
  const [pos, setPos] = useState(null);
  const hitRef        = useRef(null);
  const dateVal = payload?.[xKey] ?? payload?.date ?? payload?.label;
  const spike   = spikeMap?.[dateVal];
  if (!spike || !cx || !cy) return null;

  function handleEnter() {
    if (hitRef.current) {
      const r = hitRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
  }

  // Badge sits above the line; star icon inside
  const bR  = 13;   // badge radius
  const bY  = cy - bR - 10;  // center Y of badge circle

  return (
    <g>
      {/* Soft pulse ring — outer glow */}
      <circle cx={cx} cy={cy} r={20} fill={`${color}10`} />
      <circle cx={cx} cy={cy} r={14} fill={`${color}18`} />

      {/* Connector line from badge down to data point */}
      <line x1={cx} y1={bY + bR} x2={cx} y2={cy - 6}
        stroke={color} strokeWidth={1.5} strokeDasharray="2 2" opacity={0.45} />

      {/* Data point circle */}
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={2.5} fill={color} />

      {/* ✦ Star badge — filled circle + star glyph */}
      <circle cx={cx} cy={bY} r={bR}
        fill={color}
        style={{ filter: `drop-shadow(0 2px 8px ${color}60)` }} />
      <text x={cx} y={bY + 4.5} textAnchor="middle"
        fontSize={13} fill="#fff" fontWeight={900}
        style={{ pointerEvents:'none', userSelect:'none' }}>✦</text>

      {/* Hit area */}
      <circle ref={hitRef} cx={cx} cy={bY} r={bR + 6} fill="transparent"
        style={{ cursor:'pointer' }}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setPos(null)} />

      {/* Portal tooltip */}
      {pos && createPortal(
        <div style={{
          position: 'fixed',
          left: pos.x,
          top:  pos.y - 12,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
          pointerEvents: 'none',
          width: 300,
          maxWidth: '94vw',
          background: '#fff',
          borderRadius: 16,
          padding: '16px 18px',
          boxShadow: `0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)`,
          fontFamily: 'DM Sans, system-ui, sans-serif',
        }}>
          {/* Top row: date + result count */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{dateVal}</span>
            {(spike.avg || spike.count) && (
              <span style={{ fontWeight:700, fontSize:13, color,
                background:`${color}12`, padding:'2px 9px',
                borderRadius:20, border:`1px solid ${color}25` }}>
                {spike.avg ?? spike.count} Results
              </span>
            )}
          </div>
          {/* Summary */}
          {spike.summary && (
            <p style={{ fontSize:12.5, color:'#4B5563', lineHeight:1.6,
              margin:'0 0 12px', borderLeft:`3px solid ${color}40`, paddingLeft:10 }}>
              {spike.summary.slice(0, 200)}{spike.summary.length > 200 ? '…' : ''}
            </p>
          )}
          {/* Footer */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5,
              background:'#F3F4F6', borderRadius:20, padding:'3px 9px' }}>
              <span style={{ fontSize:10, color }}>✦</span>
              <span style={{ fontSize:11, color:'#6B7280', fontWeight:500 }}>AI Generated</span>
            </div>
            {spike.pattern_type && (
              <span style={{ fontSize:11, color, fontWeight:600,
                background:`${color}10`, padding:'3px 9px',
                borderRadius:20, border:`1px solid ${color}25` }}>
                {spike.pattern_type}
              </span>
            )}
          </div>
        </div>,
        document.body
      )}
    </g>
  );
}

/* ── Legend table used by pie / donut / sov ───────────────────────────────── */
function PieLegend({ data, xKey, valueKey, colors, total }) {
  return (
    <div className="dc-pie-legend">
      {data.map((d, i) => {
        const val = d[valueKey] ?? 0;
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={i} className="dc-pie-legend-row">
            <span className="dc-pie-legend-dot" style={{ background: colors[i] }} />
            <span className="dc-pie-legend-name">{d[xKey] ?? `Slice ${i + 1}`}</span>
            <span className="dc-pie-legend-pct">{pct}%</span>
            <span className="dc-pie-legend-val">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export function DynamicChart({ widget, theme, height = 240, dateInsights = [] }) {
  const { chartType, rawChartData = [], xKey = 'label', series = [] } = widget;
  if (!rawChartData.length) return <ChartEmpty />;

  const palette = theme?.chartPalette ?? SERIES_COLORS;
  const activeSeries = series.length > 0
    ? series.map((s, i) => ({
        ...s,
        color: s.color ?? (isSent(s.key) ? sentColor(s.key) : palette[i % palette.length]),
      }))
    : inferSeries(rawChartData, xKey, palette);

  const spikeMap = {};
  dateInsights.forEach(di => { if (di.date) spikeMap[di.date] = di; });
  const hasSpikes = dateInsights.length > 0 && (chartType === 'line' || chartType === 'area');

  /* ── LINE / AREA ────────────────────────────────────────────────────────── */
  if (chartType === 'line' || chartType === 'area') {
    const Chart  = chartType === 'area' ? AreaChart : LineChart;
    const gradId = (i) => `ag-${widget.id}-${i}`;

    return (
      <div style={{ background: 'linear-gradient(180deg,#fafbff 0%,#ffffff 100%)', borderRadius: 12, padding: '4px 0 0' }}>
        <ResponsiveContainer width="100%" height={height}>
          <Chart data={rawChartData}
            margin={{ top: hasSpikes ? 44 : 12, right: 16, bottom: 4, left: 0 }}>
            <defs>
              {activeSeries.map((s, i) => (
                <linearGradient key={s.key} id={gradId(i)} x1="0" y1="0" x2="0" y2="1">
                  {/* Rich 3-stop gradient for premium fill */}
                  <stop offset="0%"   stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="50%"  stopColor={s.color} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey={xKey} tick={AX} axisLine={false} tickLine={false} />
            <YAxis tick={AX} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<LineTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Legend iconType="circle"
              align="right" verticalAlign="bottom"
              wrapperStyle={{ fontSize: 11, paddingTop: 14, fontFamily: 'DM Sans, sans-serif' }}
              formatter={(value, entry) => (
                <span style={{ color: entry.color, fontWeight: 600, marginRight: 14, fontSize: 12 }}>
                  {value}
                </span>
              )} />
            {/* Dashed vertical reference lines at spike dates */}
            {hasSpikes && dateInsights.map(di => (
              <ReferenceLine key={di.date} x={di.date}
                stroke={`${activeSeries[0]?.color}28`}
                strokeDasharray="4 4" strokeWidth={1} />
            ))}
            {activeSeries.map((s, i) => (
              chartType === 'area' ? (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key}
                  stroke={s.color} strokeWidth={3}
                  fill={`url(#${gradId(i)})`}
                  dot={hasSpikes ? <SpikeDot xKey={xKey} spikeMap={spikeMap} color={s.color} /> : false}
                  activeDot={{ r: 6, fill: s.color, stroke: '#fff', strokeWidth: 2.5 }} />
              ) : (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label ?? s.key}
                  stroke={s.color} strokeWidth={3}
                  dot={hasSpikes ? <SpikeDot xKey={xKey} spikeMap={spikeMap} color={s.color} /> : false}
                  activeDot={{ r: 6, fill: s.color, stroke: '#fff', strokeWidth: 2.5 }} />
              )
            ))}
          </Chart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── DONUT ───────────────────────────────────────────────────────────────── */
  if (chartType === 'donut') {
    const valueKey = activeSeries[0]?.key ?? 'value';
    const total    = rawChartData.reduce((s, d) => s + (d[valueKey] ?? 0), 0);
    const colors   = rawChartData.map((d, i) => isSent(d[xKey]) ? sentColor(d[xKey]) : palette[i % palette.length]);
    const r        = Math.floor(Math.min(height * 0.44, 110));

    // Custom active shape tooltip label on hover
    const [activeIdx, setActiveIdx] = useState(null);
    const activeEntry = activeIdx != null ? rawChartData[activeIdx] : null;
    const activeColor = activeIdx != null ? colors[activeIdx] : '#000';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <PieLegend data={rawChartData} xKey={xKey} valueKey={valueKey} colors={colors} total={total} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieChart width={r * 2 + 32} height={height}>
            <defs>
              {colors.map((c, i) => (
                <radialGradient key={i} id={`dg-${widget.id}-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor={c} stopOpacity={1} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.75} />
                </radialGradient>
              ))}
            </defs>
            <Pie data={rawChartData} cx="50%" cy="50%"
              outerRadius={r} innerRadius={Math.floor(r * 0.68)}
              dataKey={valueKey} nameKey={xKey}
              paddingAngle={3} startAngle={90} endAngle={-270}
              strokeWidth={0}
              onMouseEnter={(_, idx) => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}>
              {rawChartData.map((_, i) => (
                <Cell key={i} fill={`url(#dg-${widget.id}-${i})`}
                  stroke="none"
                  style={{
                    filter: activeIdx === i
                      ? `drop-shadow(0 0 12px ${colors[i]}90)`
                      : `drop-shadow(0 2px 8px ${colors[i]}40)`,
                    transition: 'filter 0.2s',
                  }} />
              ))}
            </Pie>
          </PieChart>
          {/* Center label */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none', width: 100,
          }}>
            <div style={{ fontWeight: 800, fontSize: 24, color: '#111827', lineHeight: 1,
              fontFamily: 'Bricolage Grotesque, DM Sans, sans-serif' }}>
              {fmtNum(total)}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 }}>Total Articles</div>
          </div>
          {/* Hover tooltip on active slice */}
          {activeEntry && (
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 10, padding: '6px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'none', textAlign: 'center', minWidth: 90,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: activeColor }}>{activeEntry[xKey]}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                {(activeEntry[valueKey] ?? 0).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── PIE / SOV / sentiment pie ───────────────────────────────────────────── */
  if (chartType === 'pie' || chartType === 'sov') {
    const valueKey = activeSeries[0]?.key ?? 'value';
    const total    = rawChartData.reduce((s, d) => s + (d[valueKey] ?? 0), 0);
    const colors   = rawChartData.map((d, i) => isSent(d[xKey]) ? sentColor(d[xKey]) : SERIES_COLORS[i % SERIES_COLORS.length]);
    const r        = Math.floor(Math.min(height * 0.44, 110));
    const [activeIdx, setActiveIdx] = useState(null);
    const activeEntry = activeIdx != null ? rawChartData[activeIdx] : null;
    const activeColor = activeIdx != null ? colors[activeIdx] : '#000';

    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      if (percent < 0.06) return null;
      const rad = innerRadius + (outerRadius - innerRadius) * 0.55;
      const x   = cx + rad * Math.cos(-midAngle * RADIAN);
      const y   = cy + rad * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
          fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>
      );
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <PieLegend data={rawChartData} xKey={xKey} valueKey={valueKey} colors={colors} total={total} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieChart width={r * 2 + 32} height={height}>
            <Pie data={rawChartData} cx="50%" cy="50%"
              outerRadius={r} innerRadius={0}
              dataKey={valueKey} nameKey={xKey}
              labelLine={false} label={renderLabel} paddingAngle={1}
              onMouseEnter={(_, idx) => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}>
              {rawChartData.map((_, i) => (
                <Cell key={i} fill={colors[i]}
                  style={{ filter: activeIdx === i ? `drop-shadow(0 0 8px ${colors[i]}80)` : 'none', transition: 'filter 0.2s' }} />
              ))}
            </Pie>
          </PieChart>
          {/* Hover tooltip */}
          {activeEntry && (
            <div style={{
              position: 'absolute', top: 0, right: -10, transform: 'translateX(100%)',
              background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 10, padding: '6px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'none', minWidth: 90,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: activeColor }}>{activeEntry[xKey]}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>
                {(activeEntry[valueKey] ?? 0).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── HORIZONTAL BAR (Top Authors / Top Publications) ─────────────────────── */
  if (chartType === 'horizontal-bar') {
    const valueKey = activeSeries[0]?.key ?? 'value';
    const rowH     = 52;
    return (
      <ResponsiveContainer width="100%" height={Math.max(height, rawChartData.length * rowH + 60)}>
        <BarChart data={rawChartData} layout="vertical" barSize={22}
          margin={{ top: 8, right: 24, bottom: 16, left: 0 }}>
          <defs>
            <linearGradient id={`hbg-${widget.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={PALETTE.blue[3]} stopOpacity={0.85} />
              <stop offset="100%" stopColor={PALETTE.blue[7]} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke={GC} horizontal={false} />
          <XAxis type="number" tick={AX} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={xKey}
            tick={{ ...AX, fill: '#374151', fontWeight: 500, fontSize: 12 }}
            axisLine={false} tickLine={false} width={130} />
          <Tooltip content={<HBarTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
          <Bar dataKey={valueKey} fill={`url(#hbg-${widget.id})`} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  /* ── SENTIMENT BAR (horizontal stacked: green/red/gray per row) ─────────── */
  if (chartType === 'sentiment-bar') {
    const posKey = activeSeries.find(s => isSent(s.key) && sentColor(s.key) === SENT_COLORS.Positive)?.key
                ?? activeSeries.find(s => s.key.toLowerCase().includes('pos'))?.key ?? 'POS';
    const negKey = activeSeries.find(s => isSent(s.key) && sentColor(s.key) === SENT_COLORS.Negative)?.key
                ?? activeSeries.find(s => s.key.toLowerCase().includes('neg'))?.key ?? 'NEG';
    const neuKey = activeSeries.find(s => isSent(s.key) && sentColor(s.key) === SENT_COLORS.Neutral)?.key
                ?? activeSeries.find(s => s.key.toLowerCase().includes('neu'))?.key ?? 'NEU';

    const sentSeries = [
      { key: posKey, label: 'Positive', color: SENT_COLORS.Positive },
      { key: negKey, label: 'Negative', color: SENT_COLORS.Negative },
      { key: neuKey, label: 'Neutral',  color: SENT_COLORS.Neutral  },
    ].filter(s => rawChartData[0]?.[s.key] !== undefined);

    const sentTooltipFormatter = (val, name) => [val?.toLocaleString(), name];

    return (
      <ResponsiveContainer width="100%" height={Math.max(height, rawChartData.length * 52 + 60)}>
        <BarChart data={rawChartData} layout="vertical" barSize={18}
          margin={{ top: 4, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GC} horizontal={false} />
          <XAxis type="number" tick={AX} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={xKey} tick={{ ...AX, fill: '#374151', fontWeight: 500 }}
            axisLine={false} tickLine={false} width={80} />
          <Tooltip contentStyle={TS} formatter={sentTooltipFormatter}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 10, fontFamily: 'DM Sans, sans-serif' }} />
          {sentSeries.map(s => (
            <Bar key={s.key} dataKey={s.key} name={s.label}
              fill={s.color} stackId="sent"
              radius={[0, 0, 0, 0]}>
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  /* ── STACKED BAR (vertical, message congruence) ──────────────────────────── */
  if (chartType === 'stacked-bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rawChartData} barCategoryGap="28%"
          margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <defs>
            {activeSeries.map((s, i) => (
              <linearGradient key={s.key} id={`sbg-${widget.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={s.color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GC} vertical={false} />
          <XAxis dataKey={xKey} tick={AX} axisLine={false} tickLine={false} />
          <YAxis tick={{ ...AX, fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={v => `${v}%`} width={36} />
          <Tooltip contentStyle={TS}
            formatter={(v, name) => [`${v}%`, name]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {activeSeries.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key}
              stackId="a" fill={`url(#sbg-${widget.id}-${i})`}
              radius={i === activeSeries.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}>
              <LabelList dataKey={s.key} position="top"
                formatter={v => v > 3 ? `${v}%` : ''}
                style={{ fontSize: 10, fill: '#374151', fontWeight: 700 }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  /* ── VERTICAL BAR ─────────────────────────────────────────────────────────── */
  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rawChartData} barCategoryGap="30%"
          margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <defs>
            {activeSeries.map((s, i) => (
              <linearGradient key={s.key} id={`vbg-${widget.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={s.color} stopOpacity={1} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GC} vertical={false} />
          <XAxis dataKey={xKey} tick={AX} axisLine={false} tickLine={false} />
          <YAxis tick={AX} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={TS} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {activeSeries.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key}
              fill={`url(#vbg-${widget.id}-${i})`} radius={[5, 5, 0, 0]}>
              <LabelList dataKey={s.key} position="top"
                style={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  /* ── WORDCLOUD ────────────────────────────────────────────────────────────── */
  if (chartType === 'wordcloud') {
    const valueKey = activeSeries[0]?.key ?? 'value';
    const maxVal   = Math.max(...rawChartData.map(d => d[valueKey] ?? 1));
    const wColors  = [
      PALETTE.purple[5], PALETTE.blue[5],  PALETTE.teal[4],
      PALETTE.magenta[4],PALETTE.orange[5], PALETTE.cyan[5],
      PALETTE.green[5],  PALETTE.yellow[5], PALETTE.red[4],
      PALETTE.purple[4], PALETTE.blue[4],   PALETTE.teal[5],
    ];
    return <WordCloud data={rawChartData} xKey={xKey} valueKey={valueKey}
      maxVal={maxVal} colors={wColors} height={height} />;
  }

  /* ── RADIAL BAR ───────────────────────────────────────────────────────────── */
  if (chartType === 'radialBar') {
    const valueKey = activeSeries[0]?.key ?? 'value';
    const radData  = rawChartData.map((d, i) => ({ ...d, fill: SERIES_COLORS[i % SERIES_COLORS.length] }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart cx="50%" cy="50%"
          innerRadius={28} outerRadius={Math.floor(height * 0.42)}
          data={radData} startAngle={180} endAngle={-180}>
          <RadialBar minAngle={12} background={{ fill: 'rgba(0,0,0,0.04)' }}
            dataKey={valueKey} cornerRadius={5} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Tooltip contentStyle={TS} />
        </RadialBarChart>
      </ResponsiveContainer>
    );
  }

  /* ── LOLLIPOP ─────────────────────────────────────────────────────────────── */
  if (chartType === 'lollipop') {
    const valueKey = activeSeries[0]?.key ?? 'value';
    const color    = activeSeries[0]?.color ?? SERIES_COLORS[0];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rawChartData} layout="vertical" barSize={3}
          margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GC} horizontal={false} />
          <XAxis type="number" tick={AX} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={xKey} tick={AX} axisLine={false}
            tickLine={false} width={100} />
          <Tooltip contentStyle={TS} />
          <Bar dataKey={valueKey} fill={color} radius={[0, 6, 6, 0]}
            label={{ position: 'right', fontSize: 11, fill: '#6B7280', fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace' }} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return <ChartEmpty type={chartType} />;
}

/* ── Word Cloud ───────────────────────────────────────────────────────────── */
function WordCloud({ data, xKey, valueKey, maxVal, colors, height }) {
  const [hov, setHov] = useState(null);
  const words = useMemo(() =>
    [...data].sort((a, b) => (b[valueKey] ?? 0) - (a[valueKey] ?? 0))
      .map((d, i) => {
        const r = (d[valueKey] ?? 1) / maxVal;
        return {
          word:   d[xKey] ?? d.label ?? `W${i}`,
          val:    d[valueKey] ?? 0,
          size:   Math.round(11 + r * 30),
          weight: r > 0.6 ? 800 : r > 0.35 ? 700 : 500,
          color:  colors[i % colors.length],
        };
      }), [data, xKey, valueKey, maxVal, colors]);

  return (
    <div className="dc-wordcloud" style={{ minHeight: height }}>
      {words.map((w, i) => (
        <span key={i} className="dc-word"
          style={{ fontSize: w.size, fontWeight: w.weight, color: w.color }}
          onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
          {w.word}
          {hov === i && (
            <span className="dc-word-tooltip">
              {w.word}<br /><strong>{w.val.toLocaleString()}</strong>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function ChartEmpty({ type }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 120, gap: 6, color: '#9CA3AF', fontSize: 12 }}>
      <span style={{ fontSize: 22 }}>📊</span>
      <span>{type ? `No data for "${type}"` : 'No chart data'}</span>
    </div>
  );
}
