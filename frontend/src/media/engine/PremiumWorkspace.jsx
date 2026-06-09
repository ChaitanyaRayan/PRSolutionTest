/**
 * PremiumWorkspace — Tabbed workspace: Dashboard View | AI Conversation
 *
 * Emil Design Principles applied:
 * - Custom easing curves (cubic-bezier(0.23,1,0.32,1)) on all transitions
 * - scale(0.97) on :active for all interactive elements
 * - Entry animations: opacity:0 + translateY(10px), never scale(0)
 * - Stagger delays (40ms) across widget grids
 * - Animations < 300ms for UI elements
 * - Asymmetric enter/exit: enter 280ms, exit 180ms
 * - CSS transitions for interruptibility
 * - No animations on keyboard-initiated actions
 * - prefers-reduced-motion respected via CSS
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Sparkles, RefreshCw, Download, ChevronRight, ChevronLeft,
  Eye, Layers, Zap, Star, LayoutGrid, TrendingUp, TrendingDown, Minus,
  ArrowRight, X,
} from 'lucide-react';
import { DynamicChart } from './charts/DynamicChart';

import { useDashboardConfig }  from '../hooks/useDashboardConfig';
import { useMediaStore }       from '../store/mediaStore';
import { HTML_TEMPLATES }      from '../constants/templates';
import { DASHBOARDS }          from '../constants/dashboards';
import ConversationTab         from './ConversationTab';
import '../premium.css';

// ── Lens colour map ────────────────────────────────────────────────────────────
const LENS_COLORS = {
  pr:           { g1: '#F97316', g2: '#FB923C', mesh: 'rgba(249,115,22,0.35)' },
  intelligence: { g1: '#5B5BD6', g2: '#818CF8', mesh: 'rgba(91,91,214,0.38)' },
  monitoring:   { g1: '#059669', g2: '#34D399', mesh: 'rgba(5,150,105,0.33)' },
  narrative:    { g1: '#DB2777', g2: '#F472B6', mesh: 'rgba(219,39,119,0.33)' },
  reputation:   { g1: '#7C3AED', g2: '#A78BFA', mesh: 'rgba(124,58,237,0.35)' },
};
const FALLBACK_LC = { g1: '#5B5BD6', g2: '#818CF8', mesh: 'rgba(91,91,214,0.38)' };
const LC = (id) => LENS_COLORS[id] ?? FALLBACK_LC;

// Recharts palette per lens
const CHART_PALETTES = {
  pr:           ['#F97316','#FB923C','#FDBA74','#FED7AA','#FFF7ED'],
  intelligence: ['#5B5BD6','#818CF8','#A5B4FC','#7C3AED','#C4B5FD'],
  monitoring:   ['#059669','#34D399','#6EE7B7','#2563EB','#93C5FD'],
  narrative:    ['#DB2777','#F472B6','#FBCFE8','#E11D48','#FB7185'],
  reputation:   ['#7C3AED','#A78BFA','#DDD6FE','#5B5BD6','#818CF8'],
};
const CHART_PALETTE = (id) => CHART_PALETTES[id] ?? CHART_PALETTES.intelligence;

// KPI gradient rotation
const KPI_GRADS = [
  'linear-gradient(135deg,#5B5BD6,#818CF8)',
  'linear-gradient(135deg,#F97316,#FB923C)',
  'linear-gradient(135deg,#059669,#34D399)',
  'linear-gradient(135deg,#DB2777,#F472B6)',
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#2563EB,#60A5FA)',
];

// Storyboard images pool
const SB_IMAGES = [
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=75',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=75',
  'https://images.unsplash.com/photo-1553484771-047a44eee27a?w=600&q=75',
  'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600&q=75',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=75',
];

// ── Emil spring / easing variants for framer-motion ──────────────────────────
const FADE_UP = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] },
};
const TAB_CONTENT = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
  transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function PremiumWorkspace({
  workflowId, lensId, brandName, template, dashboardId, onBack,
}) {
  const store = useMediaStore();
  const lc    = LC(dashboardId);
  const grad  = `linear-gradient(135deg,${lc.g1},${lc.g2})`;

  const {
    config, loading: configLoading, error: configError,
    activeTabId, setActiveTabId, reload,
  } = useDashboardConfig(workflowId, lensId);

  // Workspace-level tab: 'dashboard' | 'conversation'
  const [wsTab, setWsTab] = useState('dashboard');

  // Pre-fill a message into ConversationTab when Ask AI is clicked
  const [askAiSeed, setAskAiSeed] = useState(null);

  // Analysis modal
  const [analysisModal, setAnalysisModal] = useState(null); // { title, analysis }

  function handleAskAI(msg) {
    setAskAiSeed(msg);
    setWsTab('conversation');
  }

  // Template bar
  const templates = HTML_TEMPLATES.slice(0, 8);

  const storyboard       = config?.storyboard ?? [];
  const currentTabId     = activeTabId ?? storyboard[0]?.id;
  const currentTabIndex  = storyboard.findIndex((t) => t.id === currentTabId);
  const chartsStoryboard = config?.chartsStoryboard ?? [];

  // CSS vars for lens theming
  const cssVars = {
    '--pm-primary':   lc.g1,
    '--pm-primary-2': lc.g2,
    '--pm-grad':       grad,
    '--mesh-a':        lc.mesh,
    '--mesh-b':        `rgba(${lc.g2.match(/\d+/g)?.slice(0,3).join(',') ?? '129,140,248'},0.25)`,
    '--mesh-c':        `rgba(${lc.g1.match(/\d+/g)?.slice(0,3).join(',') ?? '91,91,214'},0.14)`,
  };

  // Reset kpiIdx on each render cycle
  let kpiIdx = 0;

  return (
    <div className="pm-root pm-shell" style={cssVars}>

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="pm-topbar">
        {onBack && (
          <button className="pm-icon-btn" onClick={onBack} title="Back" style={{ marginRight: 4 }}>
            <ChevronLeft size={15} />
          </button>
        )}
        <div className="pm-logo">
          <div className="pm-logo-mark">PS</div>
          <span>PR Solutions</span>
        </div>
        <div className="pm-topbar-sep" />
        <span className="pm-topbar-brand">{brandName ?? 'Dashboard'}</span>

        {configLoading && !config && (
          <span style={{ fontSize: 12, color: 'var(--pm-ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} className="pm-spin" /> Generating…
          </span>
        )}

        <div className="pm-topbar-right">
          <button className="pm-icon-btn" onClick={() => reload(true)} title="Regenerate dashboard">
            <RefreshCw size={14} />
          </button>
          <button className="pm-icon-btn" title="Export">
            <Download size={14} />
          </button>
          <button className="pm-btn pm-btn-primary" style={{ fontSize: 12.5 }}
            onClick={() => setWsTab(wsTab === 'conversation' ? 'dashboard' : 'conversation')}>
            <Sparkles size={13} />
            {wsTab === 'conversation' ? 'Dashboard' : 'Ask AI'}
          </button>
        </div>
      </header>

      {/* ── Workspace tab bar ────────────────────────────────────────────── */}
      <div className="pm-tab-bar">
        <div className="pm-tab-bar-inner">
          {[
            { id: 'dashboard',    label: 'Dashboard',      icon: BarChart2  },
            { id: 'conversation', label: 'AI Conversation', icon: Sparkles   },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`pm-tab-btn ${wsTab === id ? 'pm-tab-btn--active' : ''}`}
              onClick={() => setWsTab(id)}>
              <span className="pm-tab-icon"><Icon size={14} /></span>
              {label}
            </button>
          ))}
        </div>

        {/* Lens sub-tabs — only shown in dashboard mode */}
        {wsTab === 'dashboard' && storyboard.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginLeft: 24, borderLeft: '1px solid var(--pm-border)', paddingLeft: 16 }}>
            {storyboard.map((tab) => (
              <button key={tab.id}
                className={`pm-tab-btn ${tab.id === currentTabId ? 'pm-tab-btn--active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                style={{ padding: '12px 12px', fontSize: 13 }}>
                {tab.icon && <span style={{ fontSize: 12, lineHeight: 1 }}>{tab.icon}</span>}
                {tab.title}
              </button>
            ))}
          </div>
        )}

        <div className="pm-tab-bar-actions">
          {wsTab === 'dashboard' && templates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pm-ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--pm-font-display)', flexShrink: 0 }}>Style</span>
              {templates.slice(0, 5).map((tpl) => {
                const active = tpl.id === template?.id;
                return (
                  <button key={tpl.id}
                    title={tpl.name}
                    onClick={() => { if (!active) { store.setSelectedTemplate(tpl); reload(true); } }}
                    style={{
                      width: 20, height: 20,
                      borderRadius: '50%',
                      border: active ? `2px solid ${lc.g1}` : '2px solid var(--pm-border-md)',
                      background: tpl.primaryColor ?? '#5B5BD6',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                      outline: active ? `2px solid ${lc.g1}40` : 'none',
                      outlineOffset: 2,
                      transition: 'transform 100ms var(--ease-out)',
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.88)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="pm-workspace">
        <AnimatePresence mode="wait">
          {wsTab === 'dashboard' ? (
            <motion.div key="dashboard" className="pm-scroll" {...TAB_CONTENT}>
              <DashboardView
                config={config}
                configLoading={configLoading}
                configError={configError}
                brandName={brandName}
                lc={lc}
                grad={grad}
                currentTabId={currentTabId}
                currentTabIndex={currentTabIndex}
                storyboard={storyboard}
                chartsStoryboard={chartsStoryboard}
                setActiveTabId={setActiveTabId}
                reload={reload}
                dashboardId={dashboardId}
                template={template}
                kpiIdxRef={{ current: 0 }}
                onAskAI={handleAskAI}
                onAnalysis={(title, analysis) => setAnalysisModal({ title, analysis })}
              />
            </motion.div>
          ) : (
            <motion.div key="conversation" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} {...TAB_CONTENT}>
              <ConversationTab
                workflowId={workflowId}
                lensId={lensId}
                brandName={brandName}
                dashboardId={dashboardId}
                lc={lc}
                grad={grad}
                chartPalette={CHART_PALETTE(dashboardId)}
                initialMessage={askAiSeed}
                onInitialMessageConsumed={() => setAskAiSeed(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Analysis Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {analysisModal && (
          <motion.div
            key="analysis-overlay"
            style={{
              position:'fixed', inset:0,
              background:'rgba(0,0,0,0.4)',
              backdropFilter:'blur(6px)',
              zIndex:9000,
              display:'flex', alignItems:'center', justifyContent:'center',
              padding: '24px',
            }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.18 }}
            onClick={() => setAnalysisModal(null)}
          >
            <motion.div
              style={{
                width:'100%', maxWidth:620, maxHeight:'80vh',
                background:'var(--pm-surface)',
                borderRadius:20,
                boxShadow:'0 8px 16px rgba(0,0,0,0.06), 0 32px 80px rgba(0,0,0,0.22)',
                overflow:'hidden',
                display:'flex', flexDirection:'column',
              }}
              initial={{ opacity:0, y:24, scale:0.97 }}
              animate={{ opacity:1, y:0,  scale:1 }}
              exit={{    opacity:0, y:16, scale:0.97 }}
              transition={{ duration:0.22, ease:[0.23,1,0.32,1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 22px', borderBottom:'1px solid var(--pm-border)', flexShrink:0 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:grad, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <BarChart2 size={15} color="#fff" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:lc.g1, fontFamily:'var(--pm-font-display)' }}>Deep Analysis</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--pm-ink)', fontFamily:'var(--pm-font-display)' }}>{analysisModal.title}</div>
                </div>
                <button onClick={() => setAnalysisModal(null)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--pm-ink-3)', padding:6, borderRadius:8, display:'flex', alignItems:'center' }}>
                  <X size={16} />
                </button>
              </div>
              {/* Body */}
              <div style={{ padding:'22px 24px 24px', overflowY:'auto', flex:1 }}>
                <AnalysisLines text={analysisModal.analysis} primaryColor={lc.g1} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dashboard view ─────────────────────────────────────────────────────────────
function DashboardView({
  config, configLoading, configError, brandName, lc, grad,
  currentTabId, currentTabIndex, storyboard, chartsStoryboard,
  setActiveTabId, reload, dashboardId, template, kpiIdxRef,
  onAskAI, onAnalysis,
}) {
  const palette = CHART_PALETTE(dashboardId);

  // Derive current page — both widgets AND heroConfig — per active tab
  const currentPage    = useMemo(
    () => config?.pages?.find(p => p.tabId === currentTabId) ?? null,
    [config, currentTabId]
  );
  const currentWidgets = currentPage?.widgets ?? [];

  // heroConfig lives inside each page — falls back to legacy config.hero
  const heroConfig = currentPage?.heroConfig ?? config?.hero ?? {};
  const bgVideo    = template?.backgroundVideoUrl ?? null;
  const bgImage    = template?.backgroundImageUrl ?? null;

  // Hero metrics from heroConfig.stat / statLabel
  const heroMetrics = useMemo(() => {
    const h = heroConfig;
    const candidates = [
      h.stat ? { label: h.statLabel ?? 'Stat', value: h.stat } : null,
    ].filter(Boolean);
    // Also pull any top-level hero fields
    const legacy = [
      { label: 'Total Articles',  value: config?.hero?.totalArticles  },
      { label: 'Sentiment Score', value: config?.hero?.sentimentScore },
      { label: 'Audience Reach',  value: config?.hero?.audienceReach  },
    ].filter(m => m.value != null && m.value !== '—');
    return candidates.length ? candidates : legacy;
  }, [heroConfig, config]);

  function navigateTab(idx) {
    const tab = storyboard[idx];
    if (tab) setActiveTabId(tab.id);
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="pm-hero">
        <div className="pm-hero-bg" />
        {bgVideo && <><video className="pm-hero-video" src={bgVideo} autoPlay loop muted playsInline /><div className="pm-hero-scrim" /></>}
        {bgImage && !bgVideo && <><img className="pm-hero-image" src={bgImage} alt="" /><div className="pm-hero-scrim" /></>}

        <div className="pm-hero-content">
          <div className="pm-hero-eyebrow">
            <span className="pm-hero-lens-badge">{dashboardId ? dashboardId.replace(/_/g,' ') : 'Media Intelligence'}</span>
            {config?.generatedAt && (
              <span className="pm-hero-date">{new Date(config.generatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
            )}
          </div>

          <h1 className="pm-hero-title" style={{ fontFamily:'var(--pm-font-display)' }}>
            {heroConfig.headline ?? brandName ?? 'Media Dashboard'}
          </h1>

          {(heroConfig.subline ?? config?.overallAssessment) && (
            <p className="pm-hero-subtitle">
              {(heroConfig.subline ?? config?.overallAssessment ?? '').slice(0, 220)}
              {(heroConfig.subline ?? config?.overallAssessment ?? '').length > 220 ? '…' : ''}
            </p>
          )}

          {heroMetrics.length > 0 && (
            <div className="pm-hero-metrics">
              {heroMetrics.map((m, i) => (
                <div key={i} className="pm-hero-metric">
                  <span className="pm-hero-metric-val">{m.value}</span>
                  <span className="pm-hero-metric-label">{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main body ────────────────────────────────────────────────────── */}
      <div className="pm-dashboard-body">

        {/* Storyboard navigation strip */}
        {chartsStoryboard.length > 1 && currentTabIndex >= 0 && (
          <StoryboardNav
            chapters={chartsStoryboard}
            currentIdx={currentTabIndex}
            onNavigate={navigateTab}
            lc={lc}
          />
        )}

        {/* Loading skeletons */}
        {configLoading && !config && (
          <div className="pm-widget-grid pm-stagger">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} style={{ background:'var(--pm-surface)', borderRadius:'var(--pm-r-md)', padding:20, border:'1px solid var(--pm-border)' }}>
                <div className="pm-skeleton" style={{ height:12, width:'55%', marginBottom:12 }} />
                <div className="pm-skeleton" style={{ height:38, width:'75%', marginBottom:10 }} />
                <div className="pm-skeleton" style={{ height:10, width:'40%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {configError && !config && (
          <div style={{ padding:'60px 0', textAlign:'center', color:'var(--pm-ink-3)' }}>
            <BarChart2 size={32} style={{ opacity:0.25, marginBottom:12 }} />
            <p style={{ fontFamily:'var(--pm-font-display)', fontWeight:700, fontSize:16, color:'var(--pm-ink)', margin:'0 0 8px' }}>Dashboard unavailable</p>
            <p style={{ fontSize:13, margin:'0 0 16px' }}>{configError}</p>
            <button className="pm-btn pm-btn-primary" onClick={() => reload()}>
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        )}

        {/* Widget grid */}
        {currentWidgets.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTabId}
              className="pm-widget-grid pm-stagger"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {currentWidgets.map((widget, i) => {
                kpiIdxRef.current = i;
                return (
                  <div key={widget.id} className={`pm-span-${widget.span ?? 1}`}>
                    <WidgetRouter
                      widget={widget}
                      lc={lc}
                      palette={palette}
                      kpiGrad={KPI_GRADS[i % KPI_GRADS.length]}
                      onAskAI={onAskAI}
                      onAnalysis={onAnalysis}
                    />
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Empty tab */}
        {!configLoading && !configError && currentWidgets.length === 0 && (
          <div style={{ padding:'60px 0', textAlign:'center', color:'var(--pm-ink-3)' }}>
            <Sparkles size={26} style={{ opacity:0.25, marginBottom:10 }} />
            <p style={{ fontFamily:'var(--pm-font-display)', fontWeight:600, fontSize:14 }}>Switch to AI Conversation to add charts here</p>
          </div>
        )}

        {/* Executive insights — first tab only */}
        {currentTabId === storyboard[0]?.id && config?.executiveInsights && (
          <ExecInsights insights={config.executiveInsights} lc={lc} grad={grad} />
        )}

        {/* Storyboard cards */}
        {/* {chartsStoryboard.length > 0 && (
          <StoryboardCards chapters={chartsStoryboard} lc={lc} onNavigate={navigateTab} />
        )} */}

        {/* Continue banner */}
        {chartsStoryboard.length > 0 && currentTabIndex < chartsStoryboard.length - 1 && (
          <ContinueBanner
            current={chartsStoryboard[currentTabIndex]}
            next={chartsStoryboard[currentTabIndex + 1]}
            onContinue={() => navigateTab(currentTabIndex + 1)}
            lc={lc}
          />
        )}
      </div>
    </>
  );
}

// ── Widget router ──────────────────────────────────────────────────────────────
function WidgetRouter({ widget, lc, palette, kpiGrad, onAskAI, onAnalysis }) {
  switch (widget.type) {
    case 'hero-banner': return <HeroBannerWidget w={widget} lc={lc} />;
    case 'kpi-card':    return <KpiCard w={widget} grad={kpiGrad} />;
    case 'chart':       return <ChartCard w={widget} lc={lc} palette={palette} onAskAI={onAskAI} onAnalysis={onAnalysis} />;
    case 'insight':     return <InsightCard w={widget} lc={lc} />;
    case 'narrative':   return <NarrativeCard w={widget} lc={lc} />;
    default:            return <GenericCard w={widget} />;
  }
}

// ── Hero banner widget ─────────────────────────────────────────────────────────
function HeroBannerWidget({ w, lc }) {
  const grad = `linear-gradient(135deg,${lc.g1},${lc.g2})`;
  return (
    <div style={{ background:'var(--pm-surface)', border:'1px solid var(--pm-border)', borderRadius:'var(--pm-r-md)', padding:'24px 26px', position:'relative', overflow:'hidden', boxShadow:'var(--pm-shadow-sm)' }}>
      <div style={{ position:'absolute', inset:0, background:grad, opacity:0.05 }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:grad }} />
      <div style={{ position:'relative' }}>
        <div className="pm-label" style={{ color:lc.g1, marginBottom:8 }}>{w.title}</div>
        <h2 style={{ fontFamily:'var(--pm-font-display)', fontSize:22, fontWeight:700, color:'var(--pm-ink)', margin:'0 0 8px', letterSpacing:'-0.02em' }}>
          {w.headline ?? w.title}
        </h2>
        {(w.subline ?? w.content) && (
          <p style={{ fontSize:14, color:'var(--pm-ink-2)', lineHeight:1.65, margin:0, maxWidth:700 }}>
            {(w.subline ?? w.content ?? '').slice(0, 280)}
          </p>
        )}
      </div>
      <span style={{ position:'absolute', top:18, right:22, background:grad, color:'#fff', fontSize:11, fontWeight:700, fontFamily:'var(--pm-font-display)', padding:'4px 11px', borderRadius:'var(--pm-r-full)', letterSpacing:'0.05em' }}>
        Intelligence Report
      </span>
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────────
function KpiCard({ w, grad }) {
  const isPos = w.deltaPos === true;
  const isNeg = w.deltaPos === false;
  return (
    <div className="pm-kpi-card" style={{ '--kpi-grad': grad }}>
      <div className="pm-kpi-card-accent" />
      <div className="pm-kpi-card-orb" />
      <div className="pm-kpi-card-label">{w.label ?? w.title}</div>
      <span className="pm-kpi-card-value">{w.value}</span>
      {w.delta && (
        <span className={`pm-kpi-delta pm-kpi-delta--${isPos ? 'pos' : isNeg ? 'neg' : 'neu'}`}>
          {isPos ? <TrendingUp size={10} /> : isNeg ? <TrendingDown size={10} /> : <Minus size={10} />}
          {w.delta}
        </span>
      )}
      {w.insight && (
        <p style={{ fontSize:12, color:'var(--pm-ink-3)', lineHeight:1.45, marginTop:8, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {w.insight}
        </p>
      )}
    </div>
  );
}

// ── Ask AI suggestions per chart type ─────────────────────────────────────────
function chartSuggestions(w) {
  const t = (w.chartType ?? w.type ?? '').toLowerCase();
  const title = w.title ?? 'this chart';
  if (t.includes('sentiment') || title.toLowerCase().includes('sentiment'))
    return [
      `What is driving the positive sentiment in ${title}?`,
      `Which sources are contributing most to negative sentiment?`,
      `How has sentiment shifted compared to the previous period?`,
    ];
  if (t === 'line' || t === 'area' || title.toLowerCase().includes('time') || title.toLowerCase().includes('volume'))
    return [
      `Why is there a high volume spike in ${title}?`,
      `What events caused the peaks in coverage?`,
      `Show me a breakdown of topics during the highest traffic period`,
    ];
  if (t === 'horizontal-bar' || t === 'lollipop' || title.toLowerCase().includes('author') || title.toLowerCase().includes('publication'))
    return [
      `Which of these sources has the most positive coverage?`,
      `What topics are these publications covering about us?`,
      `How can we increase coverage from the top sources?`,
    ];
  if (t === 'pie' || t === 'donut' || t === 'sov')
    return [
      `What is driving the largest share in ${title}?`,
      `How can we improve our share of voice vs competitors?`,
      `Show trend of how this distribution has changed over time`,
    ];
  if (t.includes('theme') || title.toLowerCase().includes('theme'))
    return [
      `Which theme has the most positive impact on our brand?`,
      `What is the sentiment breakdown for each theme?`,
      `Which themes should we focus on to improve coverage?`,
    ];
  return [
    `Give me deeper insights on ${title}`,
    `What actions should we take based on ${title}?`,
    `How does ${title} compare to industry benchmarks?`,
  ];
}

// ── Chart card ─────────────────────────────────────────────────────────────────
function ChartCard({ w, lc, palette, onAskAI, onAnalysis }) {
  const [askOpen, setAskOpen] = useState(false);
  const grad        = `linear-gradient(135deg,${lc.g1},${lc.g2})`;
  const suggestions = chartSuggestions(w);

  return (
    <div className="pm-chart-card" style={{ position: 'relative' }}>
      <div className="pm-chart-card-top" />

      {/* Header */}
      <div className="pm-chart-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 className="pm-chart-card-title">{w.title}</h4>
          {w.subtitle && <p className="pm-chart-card-sub">{w.subtitle}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Ask AI button */}
          {onAskAI && (
            <button
              onClick={() => setAskOpen(o => !o)}
              style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'5px 10px', borderRadius:'var(--pm-r-sm)',
                border:`1px solid ${lc.g1}44`,
                background: askOpen ? grad : `${lc.g1}10`,
                color: askOpen ? '#fff' : lc.g1,
                fontSize:11, fontWeight:700,
                cursor:'pointer', fontFamily:'var(--pm-font-body)',
                transition:'all 0.15s', whiteSpace:'nowrap',
              }}>
              <Sparkles size={11} />
              Ask AI
            </button>
          )}
          {/* Analysis button → opens modal */}
          {w.analysis && onAnalysis && (
            <button
              onClick={() => onAnalysis(w.title, w.analysis)}
              style={{
                display:'flex', alignItems:'center', gap:4,
                padding:'5px 10px', borderRadius:'var(--pm-r-sm)',
                border:'1px solid var(--pm-border)', background:'var(--pm-surface-2)',
                fontSize:11, fontWeight:600, color:'var(--pm-ink-3)',
                cursor:'pointer', fontFamily:'var(--pm-font-body)',
                transition:'all 0.15s', whiteSpace:'nowrap',
              }}>
              <BarChart2 size={11} />
              Analysis
            </button>
          )}
        </div>
      </div>

      {/* Ask AI suggestion panel */}
      <AnimatePresence>
        {askOpen && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            transition={{ duration:0.2, ease:[0.23,1,0.32,1] }}
            style={{ overflow:'hidden' }}>
            <div style={{
              margin:'0 16px 12px',
              padding:'12px 14px',
              background:`${lc.g1}08`,
              borderRadius:'var(--pm-r-md)',
              border:`1px solid ${lc.g1}22`,
            }}>
              <div style={{ fontSize:11, fontWeight:700, color:lc.g1, marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
                <Sparkles size={10} /> Suggested questions
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { onAskAI(s); setAskOpen(false); }}
                    style={{
                      textAlign:'left', background:'var(--pm-surface)',
                      border:`1px solid ${lc.g1}22`, borderRadius:'var(--pm-r-sm)',
                      padding:'8px 12px', fontSize:12, color:'var(--pm-ink-2)',
                      cursor:'pointer', fontFamily:'var(--pm-font-body)',
                      transition:'all 0.15s', lineHeight:1.45,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = lc.g1; e.currentTarget.style.color = lc.g1; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${lc.g1}22`; e.currentTarget.style.color = 'var(--pm-ink-2)'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      <div className="pm-chart-body">
        <DynamicChart
          widget={w}
          theme={{ primaryColor: lc.g1, chartPalette: palette }}
          height={w.height ?? 220}
          dateInsights={w.dateInsights ?? []}
        />
      </div>

      {/* AI insight row */}
      {w.insight && (
        <div className="pm-chart-insight">
          <Sparkles size={12} style={{ color:lc.g1, flexShrink:0, marginTop:1 }} />
          <p><MarkdownBold text={w.insight} /></p>
        </div>
      )}
    </div>
  );
}

// ── Recharts renderer ──────────────────────────────────────────────────────────
// ── Insight card ───────────────────────────────────────────────────────────────
function InsightCard({ w, lc }) {
  return (
    <div className="pm-insight-card">
      <div className="pm-insight-card-stripe" style={{ background:`linear-gradient(135deg,${lc.g1},${lc.g2})` }} />
      <div className="pm-insight-badge" style={{ background:`${lc.g1}12`, color:lc.g1 }}>
        <Sparkles size={9} /> AI Insight
      </div>
      <h3 className="pm-insight-title">{w.title}</h3>
      {w.content && <p className="pm-insight-body"><MarkdownBold text={w.content} /></p>}
      {w.highlights?.length > 0 && (
        <ul className="pm-insight-list">
          {w.highlights.map((h, i) => (
            <li key={i} className="pm-insight-item">
              <span className="pm-insight-item-dot" style={{ background:lc.g1 }} />
              <MarkdownBold text={h} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Narrative card ─────────────────────────────────────────────────────────────
function NarrativeCard({ w, lc }) {
  return (
    <div className="pm-insight-card" style={{ background:`linear-gradient(135deg,${lc.g1}06,${lc.g2}04,var(--pm-surface))` }}>
      <div className="pm-insight-card-stripe" style={{ background:`linear-gradient(135deg,${lc.g1},${lc.g2})` }} />
      <h3 className="pm-insight-title" style={{ color:lc.g1 }}>{w.title}</h3>
      {w.content && <p className="pm-insight-body"><MarkdownBold text={w.content} /></p>}
      {w.highlights?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
          {w.highlights.map((h, i) => (
            <span key={i} style={{ padding:'4px 10px', borderRadius:'var(--pm-r-full)', border:`1px solid ${lc.g1}28`, color:lc.g1, fontSize:12, fontWeight:500, background:`${lc.g1}08` }}>{h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function GenericCard({ w }) {
  return (
    <div style={{ background:'var(--pm-surface)', borderRadius:'var(--pm-r-md)', padding:'16px 18px', border:'1px solid var(--pm-border)' }}>
      <h4 style={{ fontFamily:'var(--pm-font-display)', fontSize:14, fontWeight:700, margin:0, color:'var(--pm-ink)' }}>{w.title ?? w.id}</h4>
    </div>
  );
}

// ── Executive insights ─────────────────────────────────────────────────────────
function ExecInsights({ insights, lc, grad }) {
  return (
    <motion.div className="pm-exec-panel" {...FADE_UP} transition={{ duration:0.35, ease:[0.23,1,0.32,1], delay:0.1 }}>
      <div className="pm-exec-header">
        <div className="pm-exec-icon" style={{ background:grad }}>
          <Sparkles size={14} color="#fff" />
        </div>
        <div>
          <div className="pm-label" style={{ color:lc.g1 }}>Executive Intelligence</div>
          <div style={{ fontFamily:'var(--pm-font-display)', fontSize:14, fontWeight:700, color:'var(--pm-ink)', letterSpacing:'-0.01em' }}>Strategic Summary</div>
        </div>
      </div>
      <div className="pm-exec-body">
        {insights.summary && <p className="pm-exec-summary"><MarkdownBold text={insights.summary} /></p>}
        {['keyFindings','recommendations','risks'].map((key) => {
          const items = insights[key] ?? [];
          if (!items.length) return null;
          const colors = { keyFindings: lc.g1, recommendations: '#059669', risks: '#DC2626' };
          const labels = { keyFindings: 'Key Findings', recommendations: 'Recommendations', risks: 'Risks' };
          return (
            <div key={key}>
              <div className="pm-exec-col-title" style={{ color:colors[key] }}>{labels[key]}</div>
              {items.map((item, i) => (
                <div key={i} className="pm-exec-item">
                  <span className="pm-exec-dot" style={{ background:colors[key] }} />
                  {item}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Storyboard nav strip ───────────────────────────────────────────────────────
function StoryboardNav({ chapters, currentIdx, onNavigate, lc }) {
  const prev = chapters[currentIdx - 1];
  const curr = chapters[currentIdx];
  const next = chapters[currentIdx + 1];
  return (
    <div className="pm-story-nav" style={{ marginBottom:20 }}>
      <div className="pm-story-nav-col">
        {prev ? (
          <>
            <div className="pm-story-nav-eyebrow"><ChevronLeft size={9} /> PREVIOUSLY · {prev.tab_name?.toUpperCase()}</div>
            <p className="pm-story-nav-title">{prev.title}</p>
            <p className="pm-story-nav-desc">{prev.description?.slice(0,90)}{prev.description?.length > 90 ? '…' : ''}</p>
          </>
        ) : <p className="pm-story-nav-desc" style={{ fontStyle:'italic' }}>First chapter</p>}
      </div>
      <div className="pm-story-nav-sep" />
      <div className="pm-story-nav-col pm-story-nav-col--center">
        <div className="pm-story-nav-eyebrow" style={{ color:lc.g1 }}>
          <span className="pm-story-nav-dot-sm" style={{ background:lc.g1 }} />
          THIS CHAPTER · {curr?.section_label ?? curr?.tab_name?.toUpperCase()}
        </div>
        <p className="pm-story-nav-title pm-story-nav-title--current" style={{ color:lc.g1 }}>{curr?.title}</p>
        <p className="pm-story-nav-desc">{curr?.description?.slice(0,120)}{curr?.description?.length > 120 ? '…' : ''}</p>
        {curr?.what_to_watch_for?.length > 0 && (
          <div className="pm-story-chips">
            {curr.what_to_watch_for.slice(0,3).map((item, i) => (
              <span key={i} className="pm-story-chip-sm">{item}</span>
            ))}
          </div>
        )}
      </div>
      <div className="pm-story-nav-sep" />
      <div className="pm-story-nav-col" style={{ textAlign:'right' }}>
        {next ? (
          <>
            <div className="pm-story-nav-eyebrow" style={{ justifyContent:'flex-end' }}>
              COMING NEXT · {next.tab_name?.toUpperCase()} <ChevronRight size={9} />
            </div>
            <p className="pm-story-nav-title">{next.title}</p>
            <p className="pm-story-nav-desc">{next.description?.slice(0,90)}{next.description?.length > 90 ? '…' : ''}</p>
            <button className="pm-story-nav-link" style={{ color:lc.g1, alignSelf:'flex-end' }} onClick={() => onNavigate(currentIdx + 1)}>
              Skip ahead →
            </button>
          </>
        ) : <p className="pm-story-nav-desc" style={{ fontStyle:'italic' }}>Final chapter</p>}
      </div>
    </div>
  );
}

// ── Storyboard cards ───────────────────────────────────────────────────────────
function StoryboardCards({ chapters, lc, onNavigate }) {
  return (
    <div className="pm-section" style={{ marginTop:28 }}>
      <div className="pm-section-header">
        <div>
          <div className="pm-section-eyebrow">Intelligence Narrative</div>
          <h2 className="pm-section-title" style={{ fontFamily:'var(--pm-font-display)' }}>Story of this Period</h2>
        </div>
      </div>
      <div className="pm-story-grid pm-stagger">
        {chapters.slice(0, 3).map((ch, i) => (
          <div key={i} className="pm-story-card" role="button" onClick={() => onNavigate(i)}>
            <div className="pm-story-card-image">
              <img src={SB_IMAGES[i % SB_IMAGES.length]} alt={ch.title} loading="lazy" />
              <div className="pm-story-card-image-scrim" />
              <span className="pm-story-chip" style={{ background:`linear-gradient(135deg,${lc.g1},${lc.g2})` }}>
                Chapter {ch.chapter ?? i + 1}
              </span>
            </div>
            <div className="pm-story-card-body">
              <div className="pm-story-card-chapter" style={{ color:lc.g1 }}>
                {ch.section_label ?? ch.tab_name}
              </div>
              <h3 className="pm-story-card-title">{ch.title}</h3>
              <p className="pm-story-card-desc">{ch.description}</p>
              <div className="pm-story-card-footer">
                {ch.what_to_watch_for?.[0] && (
                  <span style={{ fontSize:11, color:'var(--pm-ink-4)', display:'flex', alignItems:'center', gap:3 }}>
                    <Eye size={10} /> {ch.what_to_watch_for[0].slice(0,30)}
                  </span>
                )}
                <button className="pm-story-card-cta" style={{ color:lc.g1 }}>
                  Explore <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Continue banner ────────────────────────────────────────────────────────────
function ContinueBanner({ next, onContinue, lc }) {
  const num = String(next?.chapter ?? 2).padStart(2, '0');
  const quote = `"${next?.description?.split('.')[0] ?? `Continue to ${next?.tab_name}`}."`;
  return (
    <motion.div className="pm-continue-banner" {...FADE_UP} transition={{ duration:0.35, ease:[0.23,1,0.32,1], delay:0.15 }}>
      <div className="pm-continue-banner-bg" style={{ background:`linear-gradient(135deg,${lc.g1},${lc.g2})` }} />
      <div className="pm-continue-banner-sheen" />
      <div className="pm-continue-left">
        <span className="pm-continue-num">{num}</span>
        <div className="pm-continue-meta">
          <span className="pm-continue-eyebrow">The Next Chapter</span>
          <p className="pm-continue-quote">{quote}</p>
          <p className="pm-continue-sub">Continue to <strong>{next?.tab_name}</strong></p>
        </div>
      </div>
      <button className="pm-continue-btn" onClick={onContinue}>
        Continue →
      </button>
    </motion.div>
  );
}

function MarkdownBold({ text }) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : <React.Fragment key={i}>{p}</React.Fragment>)}</>;
}

function AnalysisLines({ text, primaryColor }) {
  if (!text) return null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {text.split(/\\n|\n/).filter(Boolean).map((line, i) => {
        const isBullet = /^[-•]/.test(line.trimStart());
        const clean = isBullet ? line.replace(/^[\s\-•]+/, '') : line;
        return (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            {isBullet && <span style={{ width:5, height:5, borderRadius:'50%', background:primaryColor, flexShrink:0, marginTop:7 }} />}
            <span style={{ fontSize:12.5, color:'var(--pm-ink-2)', lineHeight:1.6 }}>
              <MarkdownBold text={clean} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
