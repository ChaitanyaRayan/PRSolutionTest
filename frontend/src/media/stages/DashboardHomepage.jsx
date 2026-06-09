/**
 * DashboardHomepage — Multi-Dashboard Workspace (Cinematic redesign).
 *
 * Shown when multiple dashboards are selected. Matches the "Overview" screenshot:
 *  - Full cinematic video/image background
 *  - Preview Mode / Chat Mode toggle
 *  - Left icon rail with lens navigation
 *  - Right action rail
 *  - 4 top KPI stat cards
 *  - 3 module cards (Media Intelligence, PR Impact, Competitor Intelligence)
 *  - Bottom rotating AI chat bar
 *  - Slide-in Project Settings panel
 *  - Chat Mode with suggested questions
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Monitor, Star, Layers, Zap, Eye, BarChart2, Target,
  TrendingUp, TrendingDown, ArrowRight, ArrowUpRight,
  Calendar, Download, Share2, Users, Globe, Award, Minus,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { useMediaStore }  from '../store/mediaStore';
import { DASHBOARDS }     from '../constants/dashboards';
import CinematicShell     from '../engine/CinematicShell';
import ProjectSettingsPanel from '../components/ProjectSettingsPanel';
import { useDashboardChat } from '../hooks/useDashboardConfig';

// ── Mini sparkline data (placeholder until live data) ─────────────────────────
const MEDIA_SPARK = [
  { v: 320 }, { v: 410 }, { v: 380 }, { v: 460 }, { v: 490 },
  { v: 520 }, { v: 480 }, { v: 560 }, { v: 610 }, { v: 590 },
  { v: 680 }, { v: 720 },
];
const PR_GAUGE_VAL = 74;
const SOV_DATA = [
  { name: 'Delta',     value: 34, color: '#7C3AED' },
  { name: 'United',   value: 28, color: '#EC4899' },
  { name: 'American', value: 22, color: '#F59E0B' },
  { name: 'Southwest',value: 10, color: '#3DD9D6' },
  { name: 'Others',   value:  6, color: '#D1D5DB' },
];

// ── Dashboard lens → icon map ──────────────────────────────────────────────────
const LENS_ICONS = {
  intelligence: Eye,
  monitoring:   BarChart2,
  narrative:    Layers,
  pr:           Zap,
  reputation:   Star,
};

// ── Rotating prompts ──────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { tag: 'COVERAGE',  text: 'Why did coverage spike on the evening of Apr 27?' },
  { tag: 'SENTIMENT', text: 'Which airline had the most negative sentiment and why?' },
  { tag: 'TRENDING',  text: 'What drove the United–American merger story across media?' },
  { tag: 'PR',        text: 'How did Delta\'s SkyMiles relaunch perform vs. competitors?' },
  { tag: 'NARRATIVE', text: 'What key themes are emerging in aviation media this week?' },
];

// ── Chat-mode suggested questions ─────────────────────────────────────────────
const CHAT_QUESTIONS = [
  { emoji: '📊', text: 'What is the overall sentiment picture across all 4 airlines?' },
  { emoji: '🏆', text: 'Which airline has the strongest PR performance?' },
  { emoji: '🔥', text: 'What topics are driving the most media coverage?' },
  { emoji: '📱', text: 'Break down the social vs traditional media coverage split' },
];

export default function DashboardHomepage({ workflowId, lensId, brandName, template }) {
  const navigate        = useNavigate();
  const store           = useMediaStore();
  const selectedIds     = store.selectedDashboards ?? [];
  const lenses          = DASHBOARDS.filter((d) => selectedIds.includes(d.id));

  const [mode, setMode]   = useState('preview');
  const [activeLens, setActiveLens] = useState(null);

  const { messages, thinking, sendMessage } = useDashboardChat(workflowId, lensId, () => {});

  const tplPrimary  = template?.primaryColor ?? '#7C3AED';
  const bgVideoUrl  = template?.backgroundVideoUrl ?? null;
  const bgImageUrl  = template?.backgroundImageUrl ?? null;

  // ── Left rail nav items ───────────────────────────────────────────────────
  const leftNavItems = useMemo(() => {
    const overviewItem = {
      id: 'overview',
      label: 'Overview',
      Icon: LayoutGrid,
      active: activeLens === null,
      onClick: () => setActiveLens(null),
    };
    const lensItems = lenses.map((d) => ({
      id: d.id,
      label: d.name,
      Icon: LENS_ICONS[d.id] ?? BarChart2,
      active: activeLens === d.id,
      onClick: () => {
        navigate(
          `/media/dashboard/lens/${d.id}?workflow_id=${workflowId}&lens=${lensId}&dash=${d.id}`
        );
      },
    }));
    return [overviewItem, ...lensItems];
  }, [lenses, activeLens, workflowId, lensId, navigate]);

  // ── Settings content ─────────────────────────────────────────────────────
  const settingsContent = (
    <ProjectSettingsPanel
      workflowId={workflowId}
      lensId={lensId}
      template={template}
      dashboards={lenses}
    />
  );

  return (
    <CinematicShell
      mode={mode}
      onModeChange={setMode}
      brandName={brandName}
      leftNavItems={leftNavItems}
      chatMessages={messages}
      chatThinking={thinking}
      onChatSend={sendMessage}
      backgroundVideoUrl={bgVideoUrl}
      backgroundImageUrl={bgImageUrl}
      suggestedPrompts={SUGGESTED_PROMPTS}
      settingsContent={settingsContent}
    >
      {mode === 'preview'
        ? <OverviewContent
            brandName={brandName}
            lenses={lenses}
            workflowId={workflowId}
            lensId={lensId}
            tplPrimary={tplPrimary}
            navigate={navigate}
          />
        : <ChatContent
            messages={messages}
            thinking={thinking}
            onSend={sendMessage}
          />
      }
    </CinematicShell>
  );
}

// ── Overview Content (Preview Mode) ──────────────────────────────────────────
function OverviewContent({ brandName, lenses, workflowId, lensId, tplPrimary, navigate }) {
  function openLens(dashId) {
    navigate(`/media/dashboard/lens/${dashId}?workflow_id=${workflowId}&lens=${lensId}&dash=${dashId}`);
  }

  const kpis = [
    { label: 'TOTAL MENTIONS',  value: '76',          delta: '↑ Apr 27, 2026',      deltaPos: true,  Icon: Target },
    { label: 'NET SENTIMENT',   value: '+23.7%',       delta: '↑ 23 positive vs 5 negative', deltaPos: true, Icon: TrendingUp },
    { label: 'TOTAL REACH',     value: '24M',          delta: '↑ Audience impressions', deltaPos: true, Icon: Globe },
    { label: 'TOP OUTLET',      value: 'X (Twitter)',  delta: '~ 25 of 76 mentions', deltaPos: null, Icon: Award },
  ];

  return (
    <div className="co-page">
      {/* Page header */}
      <div className="co-page-header">
        <div>
          <h1 className="co-page-title">Overview</h1>
          <p className="co-page-sub">{brandName}</p>
        </div>
        <button className="co-period-btn">
          <Calendar size={13} />
          Weekly
        </button>
      </div>

      {/* KPI row */}
      <div className="co-kpi-row">
        {kpis.map((k) => (
          <motion.div
            key={k.label}
            className="co-kpi-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: kpis.indexOf(k) * 0.07 }}
          >
            <span className="co-kpi-label">{k.label}</span>
            <span className="co-kpi-value">{k.value}</span>
            {k.delta && (
              <span className={`co-kpi-delta ${k.deltaPos === true ? 'co-kpi-delta--up' : k.deltaPos === false ? 'co-kpi-delta--down' : 'co-kpi-delta--neutral'}`}>
                {k.delta}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Module cards row */}
      <div className="co-modules-row">
        <MediaIntelligenceCard tplPrimary={tplPrimary} onOpen={() => openLens('intelligence')} />
        <PRImpactCard tplPrimary={tplPrimary} onOpen={() => openLens('pr')} />
        <CompetitorIntelligenceCard tplPrimary={tplPrimary} onOpen={() => openLens('monitoring')} />
      </div>
    </div>
  );
}

// ── Media Intelligence module card ────────────────────────────────────────────
function MediaIntelligenceCard({ tplPrimary, onOpen }) {
  return (
    <motion.div
      className="co-module-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      whileHover={{ y: -2 }}
    >
      <div className="co-module-header">
        <span className="co-module-label">MEDIA INTELLIGENCE</span>
        <button className="co-module-arrow" onClick={onOpen}><ArrowUpRight size={13} /></button>
      </div>
      <div className="co-module-metric">4,847</div>
      <div className="co-module-chart">
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={MEDIA_SPARK} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="mgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={tplPrimary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={tplPrimary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={tplPrimary} strokeWidth={1.8}
              fill="url(#mgGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="co-module-months">
        {['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Mar'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="co-module-footer">
        <TrendingUp size={11} color="#16a34a" />
        <span className="co-module-footer-text">15.1% MoM</span>
      </div>
    </motion.div>
  );
}

// ── PR Impact module card ─────────────────────────────────────────────────────
function PRImpactCard({ tplPrimary, onOpen }) {
  // Gauge SVG inline
  const val  = PR_GAUGE_VAL; // 74
  const r    = 52;
  const cx   = 80, cy = 80;
  const arc  = (pct, color, sw = 12) => {
    const startAngle = -180;
    const endAngle   = 0;
    const theta = startAngle + (endAngle - startAngle) * pct;
    const toRad = (d) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(theta));
    const y2 = cy + r * Math.sin(toRad(theta));
    const large = theta - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const bgPath    = arc(1, '#e5e7eb');
  const fillPath  = arc(val / 100, tplPrimary);

  // Needle angle: -180 to 0 maps to 0%→100%
  const needleAngle = -180 + (val / 100) * 180;
  const toRad = (d) => (d * Math.PI) / 180;
  const nx = cx + 44 * Math.cos(toRad(needleAngle));
  const ny = cy + 44 * Math.sin(toRad(needleAngle));

  return (
    <motion.div
      className="co-module-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.22 }}
      whileHover={{ y: -2 }}
    >
      <div className="co-module-header">
        <span className="co-module-label">PR IMPACT ANALYSIS</span>
        <button className="co-module-arrow" onClick={onOpen}><ArrowUpRight size={13} /></button>
      </div>
      <div className="co-module-gauge-wrap">
        <svg width="160" height="90" viewBox="0 40 160 90">
          {/* Coloured arc segments */}
          {[
            { from: 0.00, to: 0.33, color: '#ef4444' },
            { from: 0.33, to: 0.55, color: '#f97316' },
            { from: 0.55, to: 0.70, color: '#facc15' },
            { from: 0.70, to: 0.85, color: '#a3e635' },
            { from: 0.85, to: 1.00, color: '#e5e7eb' },
          ].map(({ from, to, color }, i) => {
            const a1 = -180 + from * 180;
            const a2 = -180 + to   * 180;
            const x1 = cx + r * Math.cos(toRad(a1));
            const y1 = cy + r * Math.sin(toRad(a1));
            const x2 = cx + r * Math.cos(toRad(a2));
            const y2 = cy + r * Math.sin(toRad(a2));
            const large = a2 - a1 > 180 ? 1 : 0;
            return (
              <path key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
                stroke={color} strokeWidth={10} fill="none" strokeLinecap="round"
              />
            );
          })}
          {/* Needle */}
          <circle cx={cx} cy={cy} r={5} fill="#6b7280" />
          <line x1={cx} y1={cy} x2={nx} y2={ny}
            stroke="#374151" strokeWidth={2} strokeLinecap="round" />
          {/* Label inside */}
          <text x={cx} y={cy + 22} textAnchor="middle"
            fontSize="11" fill="#16a34a" fontWeight="600" fontFamily="DM Sans, sans-serif">
            STRONG
          </text>
          {/* Percentage callout */}
          <rect x={nx - 16} y={ny - 18} width={36} height={18} rx={4} fill={tplPrimary} />
          <text x={nx + 2} y={ny - 6} textAnchor="middle"
            fontSize="9" fill="#fff" fontWeight="700" fontFamily="DM Sans, sans-serif">
            {val}%
          </text>
          {/* Scale labels */}
          {[['0%',-180],['30%',-126],['50%',-90],['100%',0]].map(([l, deg]) => {
            const lx = cx + (r + 14) * Math.cos(toRad(deg));
            const ly = cy + (r + 14) * Math.sin(toRad(deg));
            return <text key={l} x={lx} y={ly} textAnchor="middle"
              fontSize="8" fill="#9ca3af" fontFamily="DM Sans, sans-serif">{l}</text>;
          })}
        </svg>
      </div>
      <div className="co-module-footer">
        <span className="co-module-footer-text">+8.8% vs last period</span>
      </div>
    </motion.div>
  );
}

// ── Competitor Intelligence module card ───────────────────────────────────────
function CompetitorIntelligenceCard({ tplPrimary, onOpen }) {
  return (
    <motion.div
      className="co-module-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.29 }}
      whileHover={{ y: -2 }}
    >
      <div className="co-module-header">
        <span className="co-module-label">COMPETITOR INTELLIGENCE</span>
        <button className="co-module-arrow" onClick={onOpen}><ArrowUpRight size={13} /></button>
      </div>
      <div className="co-module-donut-wrap">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={SOV_DATA}
              cx={65} cy={65}
              innerRadius={44} outerRadius={62}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {SOV_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="co-module-donut-center">
          <span className="co-module-donut-val">34%</span>
          <span className="co-module-donut-label">SOV</span>
        </div>
      </div>
      <div className="co-module-footer">
        <span className="co-module-footer-text">#1 vs 4 competitors</span>
      </div>
    </motion.div>
  );
}

// ── Chat Content (Chat Mode) ──────────────────────────────────────────────────
function ChatContent({ messages, thinking, onSend }) {
  return (
    <div className="co-chat-mode">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div
            key="empty"
            className="co-chat-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="co-chat-empty-title">What would you like to know?</h2>
            <div className="co-chat-suggestions-grid">
              {CHAT_QUESTIONS.map((q, i) => (
                <motion.button
                  key={i}
                  className="co-chat-suggestion-tile"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  onClick={() => onSend(q.text)}
                >
                  <span className="co-chat-tile-emoji">{q.emoji}</span>
                  <span>{q.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="msgs" className="co-chat-history" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`co-chat-msg co-chat-msg--${msg.role}`}>
                <div className="co-chat-bubble">{msg.content}</div>
              </div>
            ))}
            {thinking && (
              <div className="co-chat-msg co-chat-msg--assistant">
                <div className="co-chat-bubble co-chat-bubble--thinking">
                  <span className="co-thinking-dot" /><span className="co-thinking-dot" /><span className="co-thinking-dot" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
