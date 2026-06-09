/**
 * PremiumDashboard — Light-first, vibrant, editorial Media Intelligence platform.
 *
 * Design: Editorial Intelligence — Syne × Plus Jakarta Sans
 * Inspired by: Linear × Airtable × Canva × Stripe
 *
 * Features:
 *  - Animated gradient mesh hero with optional video
 *  - Magazine-style storyboard navigation
 *  - Colorful glassmorphic KPI cards (lens-specific gradients)
 *  - Recharts visualizations with vibrant palettes
 *  - AI chat sidebar with quick-action chips
 *  - Template switcher bar
 *  - Inline analysis panels (no modals)
 *  - Background upload + HTML export from chat
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Loader2, X, ChevronRight, ChevronLeft,
  BarChart2, Eye, Layers, Zap, Star, LayoutGrid,
  RefreshCw, Download, Share2, MessageSquare, Maximize2,
  TrendingUp, TrendingDown, Minus, FileText, Image,
  ArrowRight, Plus,
} from 'lucide-react';
import { DynamicChart } from './charts/DynamicChart';

import { useDashboardConfig, useDashboardChat } from '../hooks/useDashboardConfig';
import { useMediaStore }    from '../store/mediaStore';
import { HTML_TEMPLATES }   from '../constants/templates';
import { DASHBOARDS }       from '../constants/dashboards';
import '../premium.css';

// ── Lens color palettes ────────────────────────────────────────────────────────
const LENS_COLORS = {
  pr:           { g1: '#FF6B6B', g2: '#FF8E53', mesh1: 'rgba(255,107,107,0.5)', mesh2: 'rgba(255,142,83,0.4)' },
  intelligence: { g1: '#4776E6', g2: '#8E54E9', mesh1: 'rgba(71,118,230,0.5)',  mesh2: 'rgba(142,84,233,0.4)' },
  monitoring:   { g1: '#11998E', g2: '#38EF7D', mesh1: 'rgba(17,153,142,0.5)',  mesh2: 'rgba(56,239,125,0.35)' },
  narrative:    { g1: '#F857A6', g2: '#FF5858', mesh1: 'rgba(248,87,166,0.5)',  mesh2: 'rgba(255,88,88,0.35)' },
  reputation:   { g1: '#6C63FF', g2: '#3F97FF', mesh1: 'rgba(108,99,255,0.5)',  mesh2: 'rgba(63,151,255,0.4)' },
};
const FALLBACK_COLORS = { g1: '#4776E6', g2: '#8E54E9', mesh1: 'rgba(71,118,230,0.5)', mesh2: 'rgba(142,84,233,0.4)' };

// Recharts chart palettes — vibrant, editorial
const CHART_PALETTE = ['#4776E6','#FF6B6B','#11998E','#F857A6','#6C63FF','#FF8E53','#38EF7D','#3F97FF'];
const CHART_PALETTE_WARM = ['#FF6B6B','#FF8E53','#F857A6','#FBBF24','#EF4444','#FB923C'];
const CHART_PALETTE_COOL = ['#4776E6','#8E54E9','#6C63FF','#3F97FF','#11998E','#38EF7D'];

function getLensColors(dashboardId) {
  return LENS_COLORS[dashboardId] ?? FALLBACK_COLORS;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PremiumDashboard({ workflowId, lensId, brandName, template, dashboardId, onBack }) {
  const store        = useMediaStore();
  const lc           = getLensColors(dashboardId ?? 'intelligence');

  const {
    config, loading: configLoading, error: configError,
    activeTabId, setActiveTabId, reload, applyConfigUpdate,
  } = useDashboardConfig(workflowId, lensId);

  const { messages, thinking, sendMessage, pendingWidgets, promotePendingWidget, dismissPendingWidget }
    = useDashboardChat(
      workflowId, lensId, applyConfigUpdate,
      (bg) => setBackground(bg),
      () => generateHtmlExport(),
    );

  const [chatOpen,    setChatOpen]    = useState(true);
  const [chatInput,   setChatInput]   = useState('');
  const [background,  setBackground]  = useState({ type: null, src: null });
  const [htmlExport,  setHtmlExport]  = useState(null);
  const [exportLoad,  setExportLoad]  = useState(false);
  const fileRef     = useRef(null);
  const chatBottomRef = useRef(null);
  const videoRef    = useRef(null);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const storyboard       = config?.storyboard ?? [];
  const currentTabId     = activeTabId ?? storyboard[0]?.id;
  const currentTabIndex  = storyboard.findIndex((t) => t.id === currentTabId);
  const currentPage      = config?.pages?.find((p) => p.tabId === currentTabId);
  const currentWidgets   = currentPage?.widgets ?? [];
  const chartsStoryboard = config?.chartsStoryboard ?? [];

  // ── Theme injection via CSS vars ───────────────────────────────────────────
  const cssVars = {
    '--pm-primary':    lc.g1,
    '--pm-primary-2':  lc.g2,
    '--pm-grad':       `linear-gradient(135deg, ${lc.g1} 0%, ${lc.g2} 100%)`,
    '--mesh-1':        lc.mesh1,
    '--mesh-2':        lc.mesh2,
    '--mesh-3':        'rgba(255,255,255,0.3)',
    '--mesh-4':        'rgba(56,239,125,0.15)',
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function generateHtmlExport() {
    setExportLoad(true);
    const tid = template?.id ?? 'template_02';
    const url = `/api/media/export-html?template_id=${tid}&workflow_id=${workflowId}&lens_id=${lensId}`;
    setHtmlExport({ url, filename: `dashboard_${tid}.html` });
    setExportLoad(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch('/api/media/upload-background', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setBackground({ type: data.type, src: data.url });
    } catch { /* ignore */ }
    e.target.value = '';
  }

  function submitChat(text) {
    const msg = (text ?? chatInput).trim();
    if (!msg) return;
    setChatInput('');
    sendMessage(msg, pendingWidgets);
  }

  function navigateTab(idx) {
    const tab = storyboard[idx];
    if (tab) setActiveTabId(tab.id);
  }

  // Hero metrics from config
  const heroMetrics = useMemo(() => {
    const hero = config?.hero ?? {};
    const cd   = config?.chartInsights ? {} : {};
    return [
      { label: 'Total Articles',  value: hero.totalArticles  ?? '—', delta: null },
      { label: 'Sentiment Score', value: hero.sentimentScore ?? '—', delta: null },
      { label: 'Audience Reach',  value: hero.audienceReach  ?? '—', delta: null },
      { label: 'PR Impact',       value: hero.prImpact       ?? '—', delta: null },
    ].filter((m) => m.value !== '—');
  }, [config]);

  // Template bar
  const templates = HTML_TEMPLATES.slice(0, 6);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pm-root pm-shell" style={cssVars}>

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="pm-topbar">
        <div className="pm-logo">
          <div className="pm-logo-mark">M</div>
          <span>PR Solutions</span>
        </div>
        <div className="pm-topbar-divider" />
        <span className="pm-topbar-brand">{brandName ?? 'Dashboard'}</span>

        {configLoading && (
          <span style={{ fontSize: 12, color: 'var(--pm-ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Loader2 size={12} className="pm-spin" /> Generating…
          </span>
        )}

        <div className="pm-topbar-right">
          <button className="pm-icon-btn" onClick={() => reload(true)} title="Regenerate">
            <RefreshCw size={14} />
          </button>
          <button className="pm-icon-btn" onClick={generateHtmlExport} title="Export HTML">
            <Download size={14} />
          </button>
          <button className="pm-icon-btn" onClick={() => setChatOpen((o) => !o)} title="AI Chat"
            style={chatOpen ? { background: `linear-gradient(135deg,${lc.g1},${lc.g2})`, color: '#fff', border: 'none' } : {}}>
            <MessageSquare size={14} />
          </button>
          <button className="pm-primary-btn" onClick={() => setChatOpen(true)}>
            <Sparkles size={13} />
            Ask AI
          </button>
        </div>
      </header>

      {/* ── Template bar ────────────────────────────────────────────────── */}
      <div className="pm-template-bar">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pm-ink-3)', fontFamily: 'var(--pm-font-display)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
          Style
        </span>
        {templates.map((tpl) => {
          const active = tpl.id === template?.id;
          return (
            <button key={tpl.id}
              className={`pm-template-chip ${active ? 'pm-template-chip--active' : ''}`}
              onClick={() => { if (!active) { store.setSelectedTemplate(tpl); reload(true); } }}>
              {!active && <span className="pm-template-dot" style={{ background: tpl.primaryColor }} />}
              {tpl.name}
            </button>
          );
        })}
      </div>

      {/* ── Body layout ─────────────────────────────────────────────────── */}
      <div className="pm-body-layout">

        {/* ── Scrollable main area ──────────────────────────────────────── */}
        <div className="pm-main-scroll">

          {/* ── Hero ────────────────────────────────────────────────────── */}
          <HeroSection
            config={config}
            brandName={brandName}
            lc={lc}
            background={background}
            videoRef={videoRef}
            heroMetrics={heroMetrics}
            overallAssessment={config?.overallAssessment}
          />

          {/* ── Tab navigation ───────────────────────────────────────────── */}
          {storyboard.length > 0 && (
            <div className="pm-tab-strip">
              {storyboard.map((tab, i) => (
                <button
                  key={tab.id}
                  className={`pm-tab-btn ${tab.id === currentTabId ? 'pm-tab-btn--active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                  style={tab.id === currentTabId ? { '--pm-primary': lc.g1 } : {}}
                >
                  {tab.icon && <span className="pm-tab-icon">{tab.icon}</span>}
                  {tab.title}
                  <span className="pm-tab-count">{i + 1}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Dashboard area ───────────────────────────────────────────── */}
          <div className="pm-dashboard-area">

            {/* Storyboard 3-panel nav */}
            {chartsStoryboard.length > 0 && currentTabIndex >= 0 && (
              <StoryboardNav
                chapters={chartsStoryboard}
                currentIdx={currentTabIndex}
                onNavigate={navigateTab}
                lc={lc}
              />
            )}

            {/* Loading skeleton */}
            {configLoading && !config && (
              <div className="pm-widget-grid">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid var(--pm-border)', boxShadow: 'var(--pm-shadow-sm)' }}>
                    <div className="pm-skeleton" style={{ height: 12, width: '60%', marginBottom: 12 }} />
                    <div className="pm-skeleton" style={{ height: 40, width: '80%', marginBottom: 8 }} />
                    <div className="pm-skeleton" style={{ height: 10, width: '40%' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {configError && !config && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--pm-ink-3)' }}>
                <BarChart2 size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 700, fontSize: 16, color: 'var(--pm-ink)' }}>
                  Dashboard unavailable
                </p>
                <p style={{ fontSize: 13, marginBottom: 16 }}>{configError}</p>
                <button className="pm-primary-btn" onClick={() => reload()}>
                  <RefreshCw size={13} /> Try again
                </button>
              </div>
            )}

            {/* Widget grid */}
            {(() => { _kpiIdx = 0; return null; })()}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTabId ?? 'default'}
                className="pm-widget-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22,1,0.36,1] }}
              >
                {currentWidgets.length === 0 && !configLoading && (
                  <div className="pm-span-3" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--pm-ink-3)' }}>
                    <Sparkles size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <p style={{ fontFamily: 'var(--pm-font-display)', fontWeight: 600 }}>
                      Ask AI to add charts to this tab
                    </p>
                  </div>
                )}
                {currentWidgets.map((widget, i) => (
                  <PremiumWidget key={widget.id} widget={widget} index={i} lc={lc} />
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Executive insights on first tab */}
            {currentTabId === storyboard[0]?.id && config?.executiveInsights && (
              <ExecutiveInsightsPanel insights={config.executiveInsights} lc={lc} />
            )}

            {/* Storyboard cards section */}
            {chartsStoryboard.length > 0 && (
              <StoryboardCardsSection chapters={chartsStoryboard} lc={lc} onNavigate={navigateTab} />
            )}

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
        </div>

        {/* ── AI Chat Sidebar ───────────────────────────────────────────── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.aside
              className="pm-chat-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Chat header */}
              <div className="pm-chat-header">
                <div className="pm-chat-icon-wrap">
                  <Sparkles size={16} color="#fff" />
                </div>
                <div className="pm-chat-header-text">
                  <p className="pm-chat-title">Intelligence Chat</p>
                  <p className="pm-chat-subtitle">Modify, explore, export</p>
                </div>
                <button className="pm-icon-btn" onClick={() => setChatOpen(false)}>
                  <X size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="pm-chat-messages">
                {messages.length === 0 && (
                  <div className="pm-chat-empty">
                    <span className="pm-chat-empty-emoji">🎯</span>
                    <p className="pm-chat-empty-title">What would you like to know?</p>
                    <p className="pm-chat-empty-desc">
                      Ask to add charts, change backgrounds, export HTML, or get insights.
                    </p>
                    <div className="pm-chat-starters">
                      {[
                        '📊 Show sentiment trend as a chart',
                        '🎨 Change the background color',
                        '📄 Export as HTML file',
                        '🔍 Which theme drives most coverage?',
                      ].map((q) => (
                        <button key={q} className="pm-chat-starter" onClick={() => submitChat(q)}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} msg={msg} lc={lc} />
                ))}
                {thinking && (
                  <div className="pm-msg pm-msg--assistant">
                    <div className="pm-msg-bubble pm-msg-bubble--thinking">
                      <span className="pm-thinking-dot" />
                      <span className="pm-thinking-dot" />
                      <span className="pm-thinking-dot" />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick chips */}
              <div className="pm-chat-quick-actions">
                <button className="pm-quick-chip" onClick={() => fileRef.current?.click()}>
                  <Image size={11} /> Upload BG
                </button>
                <button className="pm-quick-chip" onClick={generateHtmlExport}>
                  <FileText size={11} /> Export HTML
                </button>
                <button className="pm-quick-chip" onClick={() => submitChat('Summarise the key insights')}>
                  ✨ Summary
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm"
                style={{ display: 'none' }} onChange={handleFileUpload} />

              {/* Input */}
              <div className="pm-chat-input-area">
                <div className="pm-chat-input-row">
                  <input
                    className="pm-chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitChat()}
                    placeholder="Ask about data, add charts, change style…"
                    disabled={thinking}
                  />
                  <button className="pm-chat-send" onClick={() => submitChat()}
                    disabled={!chatInput.trim() || thinking}
                    style={{ background: `linear-gradient(135deg,${lc.g1},${lc.g2})` }}>
                    {thinking ? <Loader2 size={14} className="pm-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── HTML Export modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {htmlExport && (
          <HtmlExportModal url={htmlExport.url} filename={htmlExport.filename} onClose={() => setHtmlExport(null)} lc={lc} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hero Section ───────────────────────────────────────────────────────────────
function HeroSection({ config, brandName, lc, background, videoRef, heroMetrics, overallAssessment }) {
  const hero = config?.hero ?? {};
  const summary = hero.executiveSummary ?? overallAssessment?.slice(0, 220) ?? null;
  const dateRange = hero.dateRange ?? '';
  const bgVideo = background.type === 'video' ? background.src : hero.backgroundVideoUrl ?? null;
  const bgImage = background.type === 'image' ? background.src : hero.backgroundImageUrl ?? null;

  return (
    <div className="pm-hero" style={{ minHeight: 300 }}>
      {/* Animated gradient mesh */}
      <div className="pm-hero-mesh"
        style={{ '--mesh-1': lc.mesh1, '--mesh-2': lc.mesh2 }} />

      {/* Optional video */}
      {bgVideo && (
        <>
          <video ref={videoRef} className="pm-hero-video" src={bgVideo} autoPlay loop muted playsInline />
          <div className="pm-hero-video-overlay" />
        </>
      )}
      {bgImage && !bgVideo && (
        <>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="pm-hero-video-overlay" />
        </>
      )}

      {/* Content */}
      <div className="pm-hero-glass">
        <div className="pm-hero-eyebrow">
          <span className="pm-hero-eyebrow-badge">Media Intelligence</span>
          {dateRange && <span className="pm-hero-eyebrow-date">{dateRange}</span>}
        </div>

        <motion.h1 className="pm-hero-title pm-display"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {hero.headline ?? brandName ?? 'Media Dashboard'}
        </motion.h1>

        {(hero.subline ?? summary) && (
          <motion.p className="pm-hero-subtitle"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            {(hero.subline ?? summary ?? '').slice(0, 220)}{(hero.subline ?? summary ?? '').length > 220 ? '…' : ''}
          </motion.p>
        )}

        {/* Metrics row */}
        {heroMetrics.length > 0 && (
          <motion.div className="pm-hero-metrics"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            {heroMetrics.map((m, i) => (
              <div key={i} className="pm-hero-metric">
                <span className="pm-hero-metric-val"
                  style={{ background: `linear-gradient(135deg,${lc.g1},${lc.g2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {m.value}
                </span>
                <span className="pm-hero-metric-label">{m.label}</span>
                {m.delta && (
                  <span className={`pm-hero-metric-delta pm-hero-metric-delta--${m.delta.startsWith('-') || m.delta.startsWith('−') ? 'neg' : 'pos'}`}>
                    {m.delta}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Premium Widget router ──────────────────────────────────────────────────────
function PremiumWidget({ widget, index, lc }) {
  const spanClass = `pm-span-${widget.span ?? 1}`;
  return (
    <motion.div
      className={spanClass}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22,1,0.36,1] }}
    >
      <WidgetByType widget={widget} lc={lc} />
    </motion.div>
  );
}

let _kpiIdx = 0;
function WidgetByType({ widget, lc }) {
  switch (widget.type) {
    case 'hero-banner': return <HeroBannerWidget widget={widget} lc={lc} />;
    case 'kpi-card':    return <KpiCard widget={widget} lc={lc} colorIndex={_kpiIdx++} />;
    case 'chart':       return <ChartCard widget={widget} lc={lc} />;
    case 'insight':     return <InsightCard widget={widget} lc={lc} />;
    case 'narrative':   return <NarrativeCard widget={widget} lc={lc} />;
    default:            return <GenericCard widget={widget} />;
  }
}

// ── Hero Banner Widget ─────────────────────────────────────────────────────────
function HeroBannerWidget({ widget, lc }) {
  return (
    <div className="pm-hero-banner-widget">
      <div className="pm-hero-banner-widget-bg" style={{ background: `linear-gradient(135deg,${lc.g1},${lc.g2})` }} />
      <div className="pm-hero-banner-widget-content">
        <div className="pm-hero-banner-widget-eyebrow" style={{ color: lc.g1 }}>
          {widget.title}
        </div>
        <h2 className="pm-hero-banner-widget-title pm-display">
          {widget.headline ?? widget.title}
        </h2>
        {(widget.subline ?? widget.content) && (
          <p className="pm-hero-banner-widget-sub">
            {(widget.subline ?? widget.content ?? '').slice(0, 280)}
          </p>
        )}
      </div>
      <span className="pm-hero-banner-widget-badge">Intelligence Report</span>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
// Each KPI card rotates through the palette based on index
const KPI_GRADIENTS = [
  'linear-gradient(135deg,#4776E6,#8E54E9)',
  'linear-gradient(135deg,#FF6B6B,#FF8E53)',
  'linear-gradient(135deg,#11998E,#38EF7D)',
  'linear-gradient(135deg,#F857A6,#FF5858)',
  'linear-gradient(135deg,#6C63FF,#3F97FF)',
  'linear-gradient(135deg,#FBBF24,#F59E0B)',
];
function KpiCard({ widget, lc, colorIndex = 0 }) {
  const grad = KPI_GRADIENTS[colorIndex % KPI_GRADIENTS.length];
  const isPos = widget.deltaPos === true;
  const isNeg = widget.deltaPos === false;

  return (
    <div className="pm-kpi-card" style={{ background: '#fff', '--kpi-grad': grad }}>
      <div className="pm-kpi-orb" style={{ background: grad }} />
      <div className="pm-kpi-card-inner">
        <div className="pm-kpi-card-label">{widget.label ?? widget.title}</div>
        <span className="pm-kpi-card-value" style={{ background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {widget.value}
        </span>
        {widget.delta && (
          <div className={`pm-kpi-card-delta pm-kpi-card-delta--${isPos ? 'pos' : isNeg ? 'neg' : 'pos'}`}>
            {isPos ? <TrendingUp size={11} /> : isNeg ? <TrendingDown size={11} /> : <Minus size={11} />}
            {widget.delta}
          </div>
        )}
        {widget.insight && (
          <p className="pm-kpi-card-sub">{widget.insight.slice(0, 100)}</p>
        )}
      </div>
    </div>
  );
}

// ── Chart Card ─────────────────────────────────────────────────────────────────
function ChartCard({ widget, lc }) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const hasAnalysis = !!widget.analysis;
  const grad = `linear-gradient(135deg,${lc.g1},${lc.g2})`;

  // Build chart palette from lc colors + full palette
  const palette = [lc.g1, lc.g2, ...CHART_PALETTE].filter((c,i,a) => a.indexOf(c) === i).slice(0,8);

  return (
    <div className="pm-chart-card">
      <div className="pm-chart-accent-bar" style={{ background: grad }} />
      <div className="pm-chart-card-header">
        <div>
          <h4 className="pm-chart-card-title pm-display">{widget.title}</h4>
          {widget.subtitle && <p className="pm-chart-card-subtitle">{widget.subtitle}</p>}
        </div>
        {hasAnalysis && (
          <button className="pm-analysis-btn" onClick={() => setAnalysisOpen((o) => !o)}>
            <BarChart2 size={11} />
            Analysis
          </button>
        )}
      </div>

      <div className="pm-chart-body">
        <DynamicChart
          widget={widget}
          theme={{ primaryColor: lc.g1, chartPalette: palette }}
          height={widget.height ?? 220}
          dateInsights={widget.dateInsights ?? []}
        />
      </div>

      {widget.insight && (
        <div className="pm-chart-insight-row">
          <Sparkles size={12} className="pm-chart-insight-icon" style={{ color: lc.g1 }} />
          <p className="pm-chart-insight-text">
            <MarkdownBold text={widget.insight} />
          </p>
        </div>
      )}

      <AnimatePresence>
        {analysisOpen && widget.analysis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--pm-border)', background: 'var(--pm-surface-2)' }}
          >
            <div style={{ padding: '14px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <BarChart2 size={11} style={{ color: lc.g1 }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: lc.g1, fontFamily: 'var(--pm-font-display)' }}>Deep Analysis</span>
              </div>
              <AnalysisLines text={widget.analysis} primaryColor={lc.g1} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Insight Card ───────────────────────────────────────────────────────────────
function InsightCard({ widget, lc }) {
  const grad = `linear-gradient(135deg,${lc.g1},${lc.g2})`;
  return (
    <div className="pm-insight-card">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: grad, borderRadius: '14px 14px 0 0' }} />
      <div className="pm-insight-badge"
        style={{ background: `${lc.g1}15`, color: lc.g1 }}>
        <Sparkles size={10} />
        AI Insight
      </div>
      <h3 className="pm-insight-card-title pm-display">{widget.title}</h3>
      {widget.content && (
        <p className="pm-insight-content">
          <MarkdownBold text={widget.content} />
        </p>
      )}
      {widget.highlights?.length > 0 && (
        <ul className="pm-insight-highlights">
          {widget.highlights.map((h, i) => (
            <li key={i} className="pm-insight-highlight">
              <span className="pm-insight-dot" style={{ background: lc.g1 }} />
              <MarkdownBold text={h} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Narrative Card ─────────────────────────────────────────────────────────────
function NarrativeCard({ widget, lc }) {
  return (
    <div className="pm-insight-card" style={{ background: `linear-gradient(135deg,${lc.g1}08,${lc.g2}05)` }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(135deg,${lc.g1},${lc.g2})`, borderRadius: '14px 14px 0 0' }} />
      <h3 className="pm-insight-card-title pm-display" style={{ color: lc.g1 }}>{widget.title}</h3>
      {widget.content && (
        <p className="pm-insight-content"><MarkdownBold text={widget.content} /></p>
      )}
      {widget.highlights?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {widget.highlights.map((h, i) => (
            <span key={i} style={{
              padding: '4px 10px',
              borderRadius: 50,
              border: `1px solid ${lc.g1}30`,
              color: lc.g1,
              fontSize: 12,
              fontWeight: 500,
              background: `${lc.g1}08`,
            }}>{h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generic fallback ───────────────────────────────────────────────────────────
function GenericCard({ widget }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--pm-border)', boxShadow: 'var(--pm-shadow-sm)' }}>
      <h4 className="pm-display" style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--pm-ink)' }}>
        {widget.title ?? widget.id}
      </h4>
    </div>
  );
}

// ── Executive Insights Panel ───────────────────────────────────────────────────
function ExecutiveInsightsPanel({ insights, lc }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
      style={{
        background: '#fff',
        border: '1px solid var(--pm-border)',
        borderRadius: 20,
        padding: '24px 28px',
        marginTop: 24,
        boxShadow: 'var(--pm-shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(135deg,${lc.g1},${lc.g2})` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${lc.g1},${lc.g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="#fff" />
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: lc.g1, fontFamily: 'var(--pm-font-display)' }}>Executive Intelligence</span>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--pm-ink)', fontFamily: 'var(--pm-font-display)' }}>Strategic Summary</span>
        </div>
      </div>
      {insights.summary && (
        <p style={{ fontSize: 14, color: 'var(--pm-ink-2)', lineHeight: 1.65, marginBottom: 16 }}>
          <MarkdownBold text={insights.summary} />
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {['keyFindings','recommendations','risks'].map((key) => {
          const items = insights[key] ?? [];
          if (!items.length) return null;
          const colors = { keyFindings: lc.g1, recommendations: '#10B981', risks: '#EF4444' };
          const labels = { keyFindings: 'Key Findings', recommendations: 'Recommendations', risks: 'Risks to Monitor' };
          return (
            <div key={key}>
              <h5 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: colors[key], marginBottom: 8, fontFamily: 'var(--pm-font-display)' }}>
                {labels[key]}
              </h5>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5, alignItems: 'flex-start' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors[key], flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 12, color: 'var(--pm-ink-2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Storyboard 3-panel nav ─────────────────────────────────────────────────────
function StoryboardNav({ chapters, currentIdx, onNavigate, lc }) {
  if (!chapters.length) return null;
  const prev = chapters[currentIdx - 1];
  const curr = chapters[currentIdx];
  const next = chapters[currentIdx + 1];

  return (
    <div className="pm-story-nav" style={{ marginBottom: 24 }}>
      {/* Previous */}
      <div className="pm-story-nav-col">
        {prev ? (
          <>
            <div className="pm-story-nav-eyebrow">
              <ChevronLeft size={10} />
              PREVIOUSLY · {prev.tab_name?.toUpperCase()}
            </div>
            <p className="pm-story-nav-title">{prev.title}</p>
            <p className="pm-story-nav-desc">{prev.description?.slice(0,100)}{prev.description?.length > 100 ? '…' : ''}</p>
          </>
        ) : (
          <p className="pm-story-nav-desc" style={{ fontStyle: 'italic' }}>First chapter</p>
        )}
      </div>

      {/* Current */}
      <div className="pm-story-nav-divider" />
      <div className="pm-story-nav-col pm-story-nav-col--current">
        <div className="pm-story-nav-eyebrow" style={{ color: lc.g1 }}>
          <span className="pm-story-nav-dot" style={{ background: lc.g1 }} />
          THIS CHAPTER · {curr?.section_label ?? curr?.tab_name?.toUpperCase()}
        </div>
        <p className="pm-story-nav-title pm-story-nav-title--current pm-display" style={{ color: lc.g1 }}>
          {curr?.title}
        </p>
        <p className="pm-story-nav-desc">{curr?.description?.slice(0,130)}{curr?.description?.length > 130 ? '…' : ''}</p>
        {curr?.what_to_watch_for?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {curr.what_to_watch_for.slice(0,3).map((item, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '2px 8px',
                background: `${lc.g1}12`, color: lc.g1,
                borderRadius: 50, fontWeight: 600, fontFamily: 'var(--pm-font-body)',
              }}>{item}</span>
            ))}
          </div>
        )}
      </div>
      <div className="pm-story-nav-divider" />

      {/* Next */}
      <div className="pm-story-nav-col" style={{ textAlign: 'right' }}>
        {next ? (
          <>
            <div className="pm-story-nav-eyebrow" style={{ justifyContent: 'flex-end' }}>
              COMING NEXT · {next.tab_name?.toUpperCase()}
              <ChevronRight size={10} />
            </div>
            <p className="pm-story-nav-title">{next.title}</p>
            <p className="pm-story-nav-desc">{next.description?.slice(0,100)}{next.description?.length > 100 ? '…' : ''}</p>
            <button className="pm-story-nav-skip" style={{ color: lc.g1, alignSelf: 'flex-end' }}
              onClick={() => onNavigate(currentIdx + 1)}>
              Skip ahead →
            </button>
          </>
        ) : (
          <p className="pm-story-nav-desc" style={{ fontStyle: 'italic' }}>Final chapter</p>
        )}
      </div>
    </div>
  );
}

// ── Storyboard Cards Section ───────────────────────────────────────────────────
const STORY_IMAGES = [
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80',
  'https://images.unsplash.com/photo-1553484771-047a44eee27a?w=500&q=80',
  'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=500&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&q=80',
];

function StoryboardCardsSection({ chapters, lc, onNavigate }) {
  return (
    <div style={{ marginTop: 36, marginBottom: 12 }}>
      <div className="pm-storyboard-header">
        <div>
          <div className="pm-section-label">Storyboard</div>
          <h2 className="pm-section-title pm-display">Intelligence Narrative</h2>
        </div>
      </div>
      <div className="pm-storyboard-grid">
        {chapters.slice(0, 3).map((chapter, i) => (
          <motion.div key={i}
            className="pm-story-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            onClick={() => onNavigate(i)}>
            <div className="pm-story-card-image">
              <img src={STORY_IMAGES[i % STORY_IMAGES.length]}
                alt={chapter.title}
                className="pm-story-card-img"
                loading="lazy" />
              <div className="pm-story-card-img-overlay" />
              <span className="pm-story-card-chapter"
                style={{ background: `linear-gradient(135deg,${lc.g1},${lc.g2})` }}>
                Chapter {chapter.chapter ?? i + 1}
              </span>
              <div className="pm-story-card-sentiment">
                {i === 0 ? '📰' : i === 1 ? '💬' : i === 2 ? '🔥' : '📊'}
              </div>
            </div>
            <div className="pm-story-card-body">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: lc.g1, marginBottom: 5, fontFamily: 'var(--pm-font-display)' }}>
                {chapter.section_label ?? chapter.tab_name}
              </div>
              <h3 className="pm-story-card-title pm-display">{chapter.title}</h3>
              <p className="pm-story-card-desc">{chapter.description}</p>
              <div className="pm-story-card-footer">
                <div className="pm-story-card-stats">
                  {chapter.what_to_watch_for?.slice(0,1).map((w, wi) => (
                    <span key={wi} className="pm-story-stat">
                      <Eye size={9} /> {w.slice(0,30)}
                    </span>
                  ))}
                </div>
                <button className="pm-story-card-cta" style={{ color: lc.g1 }}>
                  Read <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Continue Banner ────────────────────────────────────────────────────────────
function ContinueBanner({ current, next, onContinue, lc }) {
  const quote = `"${next?.description?.split('.')[0] ?? `Continue to ${next?.tab_name}`}."`;
  const chapterNum = String(next?.chapter ?? 2).padStart(2, '0');

  return (
    <motion.div
      className="pm-continue-banner"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}>
      <div className="pm-continue-banner-bg" style={{ background: `linear-gradient(135deg,${lc.g1},${lc.g2})` }} />
      <div className="pm-continue-banner-mesh" />
      <div className="pm-continue-banner-left">
        <span className="pm-continue-num pm-display">{chapterNum}</span>
        <div className="pm-continue-text">
          <span className="pm-continue-eyebrow">The Next Chapter</span>
          <p className="pm-continue-quote">{quote}</p>
          <p className="pm-continue-sub">
            Continue to <strong>{next?.tab_name}</strong> — {next?.section_label?.toLowerCase()}
          </p>
        </div>
      </div>
      <button className="pm-continue-btn" onClick={onContinue}>
        Continue to {next?.tab_name} →
      </button>
    </motion.div>
  );
}

// ── Chat Message ───────────────────────────────────────────────────────────────
function ChatMessage({ msg, lc }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div className={`pm-msg pm-msg--${msg.role}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="pm-msg-bubble"
        style={isUser ? { background: `linear-gradient(135deg,${lc.g1},${lc.g2})`, color: '#fff' } : {}}>
        {msg.content}
        {msg.changesApplied > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: 6, fontSize: 11, fontWeight: 600,
            color: lc.g1, background: `${lc.g1}15`,
            padding: '3px 8px', borderRadius: 50, width: 'fit-content',
          }}>
            ✓ {msg.changesApplied} change{msg.changesApplied > 1 ? 's' : ''} applied
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── HTML Export Modal ──────────────────────────────────────────────────────────
function HtmlExportModal({ url, filename, onClose, lc }) {
  return (
    <>
      <motion.div className="am-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="am-modal-wrapper" onClick={onClose}>
        <motion.div className="am-modal"
          style={{ width: 860, maxWidth: '92vw' }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22 }}>
          <div className="am-header">
            <div className="am-header-left">
              <span className="am-eyebrow">HTML EXPORT</span>
              <h2 className="am-title">Preview & Download</h2>
            </div>
            <button className="am-close" onClick={onClose}><X size={16} /></button>
          </div>
          <div style={{ height: 420, borderTop: '1px solid var(--pm-border)', borderBottom: '1px solid var(--pm-border)', background: '#f8f9fc' }}>
            <iframe src={url} title="HTML Preview" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              sandbox="allow-scripts allow-same-origin" />
          </div>
          <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--pm-ink-3)', margin: 0, fontFamily: 'var(--pm-font-body)' }}>
              Template design + real API data combined into a standalone HTML file.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={url} target="_blank" rel="noreferrer"
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--pm-border)', fontSize: 13, color: 'var(--pm-ink-2)', textDecoration: 'none', fontFamily: 'var(--pm-font-body)' }}>
                Open ↗
              </a>
              <a href={url} download={filename}
                style={{ padding: '9px 18px', borderRadius: 8, background: `linear-gradient(135deg,${lc.g1},${lc.g2})`, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--pm-font-body)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> Download HTML
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function MarkdownBold({ text }) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ fontWeight: 700 }}>{p}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

function AnalysisLines({ text, primaryColor }) {
  if (!text) return null;
  const lines = text.split(/\\n|\n/).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {lines.map((line, i) => {
        const isBullet = /^[\-•]/.test(line.trimStart());
        const clean = isBullet ? line.replace(/^[\s\-•]+/, '') : line;
        return (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {isBullet && <span style={{ width: 5, height: 5, borderRadius: '50%', background: primaryColor, flexShrink: 0, marginTop: 7 }} />}
            <span style={{ fontSize: 12.5, color: 'var(--pm-ink-2)', lineHeight: 1.6 }}>
              <MarkdownBold text={clean} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
