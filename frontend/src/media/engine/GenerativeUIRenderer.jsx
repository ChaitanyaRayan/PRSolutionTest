/**
 * GenerativeUIRenderer — Renders structured AI response blocks as Fortune 500
 * executive-quality UI components.
 *
 * Inspired by Thesys Generative UI pattern:
 * Instead of plain text, every AI response is a structured document composed
 * of typed blocks that render as beautiful, interactive UI cards.
 *
 * Block types:
 *   executive_summary  — Bold headline + badge + bullet points
 *   kpi_grid           — Row of colored metric cards
 *   chart              — Any DynamicChart type with insight
 *   table              — Data table with typed columns (text, number, sentiment, trend)
 *   insight_card       — Highlighted finding with priority badge + bullets
 *   recommendation     — Action card with priority, rationale, action
 *   narrative          — Story/chapter card with theme tag
 *   text               — Rich markdown text block
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, AlertCircle,
  Lightbulb, ArrowRight, Sparkles,
  BarChart2, Target, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { DynamicChart } from './charts/DynamicChart';

// ── Design tokens matching the premium system ─────────────────────────────────
const PALETTE = {
  purple:  ['#F5F3FF','#EDE9FE','#DDD6FE','#C4B5FD','#A78BFA','#8B5CF6','#7C3AED','#6D28D9','#5B21B6','#4C1D95'],
  blue:    ['#EFF6FF','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#2563EB','#1D4ED8','#1E40AF','#1E3A8A'],
  teal:    ['#F0FDFA','#CCFBF1','#99F6E4','#5EEAD4','#2DD4BF','#14B8A6','#0D9488','#0F766E','#115E59','#134E4A'],
  green:   ['#F0FDF4','#DCFCE7','#BBF7D0','#86EFAC','#4ADE80','#22C55E','#16A34A','#15803D','#166534','#14532D'],
  orange:  ['#FFF7ED','#FFEDD5','#FED7AA','#FDBA74','#FB923C','#F97316','#EA580C','#C2410C','#9A3412','#7C2D12'],
  red:     ['#FFF1F2','#FFE4E6','#FECDD3','#FDA4AF','#FB7185','#F43F5E','#E11D48','#BE123C','#9F1239','#881337'],
  gray:    ['#F9FAFB','#F3F4F6','#E5E7EB','#D1D5DB','#9CA3AF','#6B7280','#4B5563','#374151','#1F2937','#111827'],
};

const SENT_COLORS = {
  Positive: PALETTE.green[6], positive: PALETTE.green[6], POS: PALETTE.green[6],
  Negative: PALETTE.red[5],   negative: PALETTE.red[5],   NEG: PALETTE.red[5],
  Neutral:  PALETTE.gray[4],  neutral:  PALETTE.gray[4],  NEU: PALETTE.gray[4],
};

const PRIORITY_CONFIG = {
  HIGH:   { color: '#E11D48', bg: '#FFF1F2', border: '#FDA4AF', icon: AlertCircle  },
  MEDIUM: { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', icon: Zap          },
  LOW:    { color: '#0891B2', bg: '#ECFEFF', border: '#67E8F9', icon: Lightbulb    },
};

const BADGE_CONFIG = {
  POSITIVE: { color: PALETTE.green[6], bg: PALETTE.green[0], label: 'Positive'  },
  NEGATIVE: { color: PALETTE.red[5],   bg: PALETTE.red[0],   label: 'Negative'  },
  NEUTRAL:  { color: PALETTE.gray[5],  bg: PALETTE.gray[0],  label: 'Neutral'   },
  URGENT:   { color: PALETTE.red[5],   bg: PALETTE.red[0],   label: '⚠ Urgent'  },
  INFO:     { color: PALETTE.blue[5],  bg: PALETTE.blue[0],  label: 'Info'      },
};

const CHART_COLORS = [PALETTE.purple[5],PALETTE.blue[5],PALETTE.teal[5],PALETTE.green[5],PALETTE.orange[5],PALETTE.red[5]];

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  fontSize: 12, padding: '8px 12px',
  fontFamily: 'DM Sans, system-ui, sans-serif',
};
const axisStyle = { fontSize: 11, fill: '#9CA3AF', fontFamily: 'DM Sans, system-ui, sans-serif' };

// Emil motion config
const BLOCK_ANIM = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0  },
  transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] },
};

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function GenerativeUIRenderer({ blocks = [], primaryColor = '#5B5BD6', blockRefs }) {
  if (!blocks.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
      {blocks.map((block, i) => (
        <motion.div key={i} ref={blockRefs?.current ? (el) => { blockRefs.current[i] = el; } : undefined}
          {...BLOCK_ANIM} transition={{ ...BLOCK_ANIM.transition, delay: i * 0.06 }}
          data-block-type={block.type}>
          <Block block={block} primaryColor={primaryColor} />
        </motion.div>
      ))}
    </div>
  );
}

function Block({ block, primaryColor }) {
  switch (block.type) {
    case 'executive_summary': return <ExecSummaryBlock b={block} primaryColor={primaryColor} />;
    case 'kpi_grid':          return <KpiGridBlock      b={block} primaryColor={primaryColor} />;
    case 'chart':             return <ChartBlock        b={block} primaryColor={primaryColor} />;
    case 'table':             return <TableBlock        b={block} primaryColor={primaryColor} />;
    case 'insight_card':      return <InsightCardBlock  b={block} primaryColor={primaryColor} />;
    case 'recommendation':    return <RecommendBlock    b={block} primaryColor={primaryColor} />;
    case 'narrative':         return <NarrativeBlock    b={block} primaryColor={primaryColor} />;
    case 'text':              return <TextBlock         b={block} />;
    default:                  return null;
  }
}

// ── Executive Summary ─────────────────────────────────────────────────────────
function ExecSummaryBlock({ b, primaryColor }) {
  const badge = BADGE_CONFIG[b.badge] ?? BADGE_CONFIG.INFO;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      {/* Gradient header strip */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}12, ${primaryColor}06)`,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: `0 4px 12px ${primaryColor}30`,
        }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: primaryColor,
            }}>Executive Summary</span>
            {b.badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                borderRadius: 50, background: badge.bg, color: badge.color,
                border: `1px solid ${badge.border}`,
              }}>{badge.label}</span>
            )}
          </div>
          <h3 style={{
            fontFamily: 'Bricolage Grotesque, DM Sans, sans-serif',
            fontSize: 18, fontWeight: 800, color: '#0C0D12',
            margin: 0, letterSpacing: '-0.02em', lineHeight: 1.25,
          }}>
            <MarkdownBold text={b.headline} />
          </h3>
          {b.subline && (
            <p style={{ fontSize: 13.5, color: '#3C404F', margin: '5px 0 0', lineHeight: 1.55,
              fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              <MarkdownBold text={b.subline} />
            </p>
          )}
        </div>
      </div>
      {/* Bullet points */}
      {b.points?.length > 0 && (
        <div style={{ padding: '14px 20px 16px' }}>
          {b.points.map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', background: primaryColor,
                flexShrink: 0, marginTop: 7,
              }} />
              <span style={{ fontSize: 13.5, color: '#3C404F', lineHeight: 1.6,
                fontFamily: 'DM Sans, system-ui, sans-serif' }}>
                <MarkdownBold text={pt} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KPI Grid ──────────────────────────────────────────────────────────────────
const KPI_GRADS = [
  ['#5B5BD6','#818CF8'], ['#059669','#34D399'], ['#F97316','#FB923C'],
  ['#DB2777','#F472B6'], ['#7C3AED','#A78BFA'], ['#2563EB','#60A5FA'],
];

function KpiGridBlock({ b, primaryColor }) {
  const kpis = b.kpis ?? [];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
      gap: 10,
    }}>
      {kpis.map((kpi, i) => {
        const [g1, g2] = KPI_GRADS[i % KPI_GRADS.length];
        const isPos = kpi.deltaPos === true;
        const isNeg = kpi.deltaPos === false;
        return (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 12,
            padding: '14px 16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}>
            {/* Color stripe */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
              background:`linear-gradient(90deg,${g1},${g2})` }} />
            {/* Orb */}
            <div style={{ position:'absolute', right:-16, top:-16, width:60, height:60,
              borderRadius:'50%', background:`linear-gradient(135deg,${g1},${g2})`,
              opacity:0.10, filter:'blur(12px)' }} />
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em',
              textTransform:'uppercase', color:'#737888', marginBottom:5,
              fontFamily:'DM Sans, system-ui, sans-serif' }}>
              {kpi.label}
            </div>
            <div style={{
              fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
              fontSize:26, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1,
              background:`linear-gradient(135deg,${g1},${g2})`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text', marginBottom:6,
            }}>
              {kpi.value}
            </div>
            {kpi.delta && (
              <div style={{ display:'flex', alignItems:'center', gap:4,
                fontSize:11.5, fontWeight:600, marginBottom:kpi.subtext ? 4 : 0,
                color: isPos ? '#16A34A' : isNeg ? '#E11D48' : '#9CA3AF',
              }}>
                {isPos ? <TrendingUp size={11} /> : isNeg ? <TrendingDown size={11} /> : <Minus size={11} />}
                {kpi.delta}
              </div>
            )}
            {kpi.subtext && (
              <div style={{ fontSize:11, color:'#B0B5C8',
                fontFamily:'DM Sans, system-ui, sans-serif' }}>{kpi.subtext}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Chart Block — delegates to DynamicChart for full feature support ───────────
// DynamicChart handles: dateInsights (✦ spike markers), analysis accordion,
// all chart types (area/line/bar/pie/donut/sov/sentiment-bar/horizontal-bar/wordcloud)
function ChartBlock({ b, primaryColor }) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const data = b.data ?? b.rawChartData ?? [];
  if (!data.length) return null;

  // Build a widget-shape object that DynamicChart expects
  const widget = {
    id:          `gui-${b.title ?? Math.random()}`,
    chartType:   b.chartType ?? 'bar',
    rawChartData: data,
    xKey:        b.xKey ?? 'label',
    series:      b.series ?? [],
    height:      220,
    title:       b.title,
  };

  // Theme for DynamicChart
  const theme = {
    primaryColor,
    chartPalette: CHART_COLORS,
    surfaceColor: '#fff',
    textColor: '#0C0D12',
    textMuted: '#737888',
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    }}>
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${primaryColor},${primaryColor}80)` }} />

      {/* Header */}
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 16, background: `linear-gradient(180deg,${primaryColor},${primaryColor}80)`, borderRadius: 3 }} />
          <h4 style={{ fontFamily: 'Bricolage Grotesque, DM Sans, sans-serif', fontSize: 14,
            fontWeight: 700, color: '#0C0D12', margin: 0, letterSpacing: '-0.01em' }}>
            {b.title}
          </h4>
          {b.subtitle && (
            <span style={{ fontSize: 11.5, color: '#737888', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              — {b.subtitle}
            </span>
          )}
        </div>
        {/* Analysis toggle — only if analysis text exists */}
        {b.analysis && (
          <button
            onClick={() => setAnalysisOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              border: `1px solid ${analysisOpen ? primaryColor + '50' : 'rgba(0,0,0,0.09)'}`,
              background: analysisOpen ? `${primaryColor}10` : 'transparent',
              fontSize: 11.5, fontWeight: 600,
              color: analysisOpen ? primaryColor : '#737888',
              cursor: 'pointer', fontFamily: 'DM Sans, system-ui, sans-serif',
              transition: 'all 0.15s',
            }}>
            <BarChart2 size={11} />
            Analysis
            {analysisOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {/* Chart — uses DynamicChart for full spike/tooltip support */}
      <div style={{ padding: '8px 14px 12px' }}>
        <DynamicChart
          widget={widget}
          theme={theme}
          height={220}
          dateInsights={b.dateInsights ?? []}
        />
      </div>

      {/* Insight footer */}
      {b.insight && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 18px 14px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          background: '#FAFBFC',
        }}>
          <Sparkles size={12} style={{ color: primaryColor, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#3C404F', lineHeight: 1.55, margin: 0,
            fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <MarkdownBold text={b.insight} />
          </p>
        </div>
      )}

      {/* Analysis accordion */}
      <AnimatePresence>
        {analysisOpen && b.analysis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px 16px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              background: '#F7F8FC',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                marginBottom: 10, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                color: primaryColor, fontFamily: 'Bricolage Grotesque, DM Sans, sans-serif',
              }}>
                <BarChart2 size={11} /> Deep Analysis
              </div>
              <AnalysisLines text={b.analysis} primaryColor={primaryColor} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Table Block ───────────────────────────────────────────────────────────────
function TableBlock({ b, primaryColor }) {
  const cols = b.columns ?? [];
  const rows = b.rows ?? [];
  if (!rows.length) return null;

  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)',
      borderRadius:14, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
      {b.title && (
        <div style={{ padding:'12px 16px 10px', borderBottom:'1px solid rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', gap:8,
          background:`linear-gradient(135deg,${primaryColor}08,transparent)` }}>
          <BarChart2 size={14} style={{ color:primaryColor }}/>
          <span style={{ fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
            fontSize:13.5, fontWeight:700, color:'#0C0D12', letterSpacing:'-0.01em' }}>{b.title}</span>
        </div>
      )}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse',
          fontFamily:'DM Sans, system-ui, sans-serif', fontSize:12.5 }}>
          <thead>
            <tr>
              {cols.map((col, i) => (
                <th key={i} style={{
                  padding:'9px 14px', textAlign: col.type === 'number' ? 'right' : 'left',
                  fontSize:10.5, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase',
                  color:'#737888', background:'#F7F8FC',
                  borderBottom:'1px solid rgba(0,0,0,0.07)',
                }}>
                  {col.label ?? col.key ?? col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom:'1px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {cols.map((col, ci) => {
                  const key = col.key ?? col;
                  const val = row[key] ?? row[col] ?? '—';
                  const type = col.type ?? 'text';
                  return (
                    <td key={ci} style={{
                      padding:'9px 14px',
                      textAlign: type === 'number' ? 'right' : 'left',
                      color: '#374151',
                      fontFamily: type === 'number' ? 'JetBrains Mono, monospace' : 'inherit',
                      fontWeight: type === 'number' ? 600 : 400,
                    }}>
                      {type === 'sentiment' ? (
                        <SentimentPill val={val}/>
                      ) : type === 'number' ? (
                        typeof val === 'number' ? val.toLocaleString() : val
                      ) : type === 'trend' ? (
                        <TrendCell val={val}/>
                      ) : (
                        <MarkdownBold text={String(val)}/>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SentimentPill({ val }) {
  const s = String(val);
  const c = SENT_COLORS[s] ?? SENT_COLORS[s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()];
  const bg = s.toLowerCase().startsWith('pos') ? '#F0FDF4'
           : s.toLowerCase().startsWith('neg') ? '#FFF1F2'
           : '#F9FAFB';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
      borderRadius:50, background:bg, color:c ?? '#6B7280', fontSize:11.5, fontWeight:600 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c ?? '#9CA3AF' }}/>
      {val}
    </span>
  );
}

function TrendCell({ val }) {
  const v = parseFloat(val);
  const isPos = v > 0;
  const isNeg = v < 0;
  return (
    <span style={{ display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end',
      color: isPos ? '#16A34A' : isNeg ? '#E11D48' : '#9CA3AF', fontWeight:700 }}>
      {isPos ? <TrendingUp size={12}/> : isNeg ? <TrendingDown size={12}/> : <Minus size={12}/>}
      {isPos ? '+' : ''}{val}
    </span>
  );
}

// ── Insight Card ──────────────────────────────────────────────────────────────
function InsightCardBlock({ b, primaryColor }) {
  const cfg = PRIORITY_CONFIG[b.priority ?? 'MEDIUM'] ?? PRIORITY_CONFIG.MEDIUM;
  const Icon = cfg.icon;
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 12,
      padding: '14px 18px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:cfg.bg,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={14} color={cfg.color}/>
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em',
              textTransform:'uppercase', color:cfg.color,
              fontFamily:'Bricolage Grotesque, DM Sans, sans-serif' }}>
              {b.priority ?? 'INSIGHT'}
            </span>
            {b.icon && <span style={{ fontSize:13 }}>{b.icon}</span>}
          </div>
          <h4 style={{ fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
            fontSize:14.5, fontWeight:700, color:'#0C0D12', margin:0,
            letterSpacing:'-0.01em' }}>{b.title}</h4>
        </div>
      </div>
      {b.content && (
        <p style={{ fontSize:13.5, color:'#3C404F', lineHeight:1.65, margin:'0 0 10px',
          fontFamily:'DM Sans, system-ui, sans-serif' }}>
          <MarkdownBold text={b.content}/>
        </p>
      )}
      {b.bullets?.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {b.bullets.map((bullet, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ width:4, height:4, borderRadius:'50%', background:cfg.color,
                flexShrink:0, marginTop:7 }}/>
              <span style={{ fontSize:12.5, color:'#4B5563', lineHeight:1.55,
                fontFamily:'DM Sans, system-ui, sans-serif' }}>
                <MarkdownBold text={bullet}/>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recommendation ────────────────────────────────────────────────────────────
function RecommendBlock({ b, primaryColor }) {
  const cfg = PRIORITY_CONFIG[b.priority ?? 'MEDIUM'] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}04)`,
      border: `1.5px solid ${primaryColor}20`,
      borderRadius: 12,
      padding: '14px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,${primaryColor},${primaryColor}80)` }}/>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <div style={{ width:26, height:26, borderRadius:8,
          background:`linear-gradient(135deg,${primaryColor},${primaryColor}CC)`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Target size={13} color="#fff"/>
        </div>
        <div>
          <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.09em',
            textTransform:'uppercase', color:primaryColor,
            fontFamily:'Bricolage Grotesque, DM Sans, sans-serif' }}>
            Recommendation · {b.priority ?? 'MEDIUM'}
          </span>
          <h4 style={{ fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
            fontSize:14, fontWeight:700, color:'#0C0D12', margin:0,
            letterSpacing:'-0.01em' }}>{b.title}</h4>
        </div>
      </div>
      {b.rationale && (
        <p style={{ fontSize:13, color:'#4B5563', lineHeight:1.6, margin:'0 0 8px',
          fontFamily:'DM Sans, system-ui, sans-serif' }}>
          <MarkdownBold text={b.rationale}/>
        </p>
      )}
      {b.action && (
        <div style={{ display:'flex', alignItems:'center', gap:7,
          fontSize:13, fontWeight:600, color:primaryColor,
          fontFamily:'DM Sans, system-ui, sans-serif' }}>
          <ArrowRight size={13}/>
          <MarkdownBold text={b.action}/>
        </div>
      )}
    </div>
  );
}

// ── Narrative ─────────────────────────────────────────────────────────────────
function NarrativeBlock({ b, primaryColor }) {
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)',
      borderRadius:14, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ background:`linear-gradient(135deg,${primaryColor}12,${primaryColor}06)`,
        borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'12px 18px',
        display:'flex', alignItems:'center', gap:10 }}>
        {b.chapter && (
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10,
            fontWeight:700, color:primaryColor,
            background:`${primaryColor}15`, padding:'2px 8px', borderRadius:50 }}>
            {b.chapter}
          </span>
        )}
        {b.theme && (
          <span style={{ fontSize:11, fontWeight:600, color:'#737888',
            fontFamily:'DM Sans, system-ui, sans-serif' }}>
            {b.theme}
          </span>
        )}
        <h4 style={{ fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
          fontSize:14, fontWeight:700, color:'#0C0D12', margin:'0 0 0 auto',
          letterSpacing:'-0.01em' }}>{b.title}</h4>
      </div>
      <div style={{ padding:'14px 18px' }}>
        <p style={{ fontSize:13.5, color:'#3C404F', lineHeight:1.7, margin:0,
          fontFamily:'DM Sans, system-ui, sans-serif' }}>
          <MarkdownBold text={b.content}/>
        </p>
      </div>
    </div>
  );
}

// ── Text Block ────────────────────────────────────────────────────────────────
function TextBlock({ b }) {
  return (
    <p style={{ fontSize:14, color:'#3C404F', lineHeight:1.7, margin:0,
      fontFamily:'DM Sans, system-ui, sans-serif' }}>
      <MarkdownBold text={b.content}/>
    </p>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function AnalysisLines({ text, primaryColor }) {
  if (!text) return null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {String(text).split(/\\n|\n/).filter(Boolean).map((line, i) => {
        const isBullet = /^[-•]/.test(line.trimStart());
        const clean    = isBullet ? line.replace(/^[\s\-•]+/, '') : line;
        return (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            {isBullet && (
              <span style={{ width:4, height:4, borderRadius:'50%', background:primaryColor,
                flexShrink:0, marginTop:8 }} />
            )}
            <span style={{ fontSize:12.5, color:'#3C404F', lineHeight:1.6,
              fontFamily:'DM Sans, system-ui, sans-serif' }}>
              <MarkdownBold text={clean} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MarkdownBold({ text }) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ fontWeight:700 }}>{p}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

function inferSeries(data, xKey, palette) {
  if (!data?.[0]) return [];
  return Object.keys(data[0])
    .filter(k => k !== xKey && typeof data[0][k] === 'number')
    .map((k, i) => ({
      key: k, label: k,
      color: SENT_COLORS[k] ?? palette[i % palette.length],
    }));
}

// Export for use in HTML export
export { MarkdownBold, PALETTE, SENT_COLORS, CHART_COLORS };
