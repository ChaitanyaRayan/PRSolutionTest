/**
 * DashboardEngine — Cinematic individual lens dashboard renderer.
 *
 * Data flow:
<<<<<<< Updated upstream
 *  1. chartsApi.get(workflowId, lensId)  → raw chart data from backend
 *  2. /api/media/interpret-charts        → AI enriches each item (insight text, type hints)
 *  3. ChartDataRenderer renders ALL items (bar/line/pie/table/kpi — smart detection)
 *
 * Layout (scrollable):
 *  [sticky header]
 *  [scrollable body]
 *    HeroSection          — video/image bg, brand metrics, exec summary
 *    StoryboardSection    — AI narrative cards with images
 *    Tab navigation       — StoryboardRenderer
 *    ChartDataRenderer    — ALL charts/tables/KPIs from chartsApi
 *    ExecutiveInsights    — key findings, recommendations, risks
 *
 * Theme: selected HTML template controls ALL colours. No dark theme.
=======
 *  1. GET /api/dashboard/:workflowId?lens_id=  → full config (theme + storyboard + pages)
 *     The backend fetches charts?workflow_id=&lens_id= from the external API,
 *     feeds ALL of it (chart_data + chart_insights + storyboard + overall_assessment)
 *     to Claude/OpenAI, and returns a complete dashboard config.
 *  2. config.storyboard → tabs (derived from the charts API storyboard, not hardcoded)
 *  3. config.pages[tabId].widgets → WidgetRenderer per tab (each tab has unique content)
 *
 * Chat mode:
 *  - AI responses can include chatWidgets[] — rendered inline in the conversation
 *  - Each chatWidget has "Add to [Tab]" → POST /api/dashboard/add-widget
 *  - Direct modifications (remove chart, update theme) apply immediately, no chatWidget
 *  - Full conversation history is visible and scrollable in Chat Mode
>>>>>>> Stashed changes
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
<<<<<<< Updated upstream
  RefreshCw, History, Loader2, AlertTriangle,
  Download, Sparkles, Play, Pause, TrendingUp, TrendingDown, ArrowRight,
} from 'lucide-react';
import { ThemeInjector }       from './ThemeInjector';
import { StoryboardRenderer }  from './StoryboardRenderer';
import { DashboardChat }       from '../components/DashboardChat';
import { VersionHistory }      from '../components/VersionHistory';
import ChartDataRenderer       from './ChartDataRenderer';
import { chartsApi, aiApi }    from '../api/client';
import { useMediaStore }        from '../store/mediaStore';
=======
  Loader2, AlertTriangle, RefreshCw, Sparkles,
  BarChart2, Eye, Layers, Zap, Star, LayoutGrid,
  Plus, X, Check, ChevronDown, Calendar, Download,
} from 'lucide-react';
import { WidgetRenderer }       from './WidgetRenderer';
import { ThemeInjector }        from './ThemeInjector';
import CinematicShell           from './CinematicShell';
import { StoryboardNav, StoryboardContinueBanner } from './StoryboardNav';
import TemplateShell            from './TemplateShell';
import ProjectSettingsPanel     from '../components/ProjectSettingsPanel';
import TemplateSwitcher         from '../components/TemplateSwitcher';
import { useMediaStore }        from '../store/mediaStore';
import { DASHBOARDS }           from '../constants/dashboards';
>>>>>>> Stashed changes
import { useDashboardConfig, useDashboardChat } from '../hooks/useDashboardConfig';
import { useTemplateDesign }    from '../hooks/useTemplateDesign';

<<<<<<< Updated upstream
// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardEngine({ workflowId, lensId, brandName: brandNameProp, template, dashboardId, onBack }) {
  // brandName from store as authoritative source (prop may be stale on direct URL navigation)
=======
// ── Lens icon map ──────────────────────────────────────────────────────────────
const LENS_ICONS = {
  intelligence: Eye,
  monitoring:   BarChart2,
  narrative:    Layers,
  pr:           Zap,
  reputation:   Star,
};
const LENS_LABELS = {
  intelligence: 'Media Measurement',
  monitoring:   'Media Monitoring',
  narrative:    'Narrative Intelligence',
  pr:           'PR Impact Analysis',
  reputation:   'Reputation Index',
};

// ── Per-lens rotating chat prompts ─────────────────────────────────────────────
const LENS_PROMPTS = {
  pr: [
    { tag: 'PR',        text: 'What drove the coverage surge this period?' },
    { tag: 'SENTIMENT', text: 'How did the campaign affect brand perception?' },
    { tag: 'COVERAGE',  text: 'Which outlets gave the most PR lift?' },
  ],
  intelligence: [
    { tag: 'COVERAGE',  text: 'What is total article volume compared to last month?' },
    { tag: 'TRENDING',  text: 'Which topics spiked the most this week?' },
    { tag: 'SOURCE',    text: 'Top performing outlet for coverage?' },
  ],
  monitoring: [
    { tag: 'MONITOR',   text: 'Show most impactful articles from this week' },
    { tag: 'SENTIMENT', text: 'Where did negative sentiment originate?' },
    { tag: 'ALERT',     text: 'Are there any brand risk signals to know?' },
  ],
  narrative: [
    { tag: 'NARRATIVE', text: 'What key themes are emerging in media?' },
    { tag: 'TRENDING',  text: 'Which narrative had the fastest growth?' },
    { tag: 'AI',        text: 'Generate a narrative summary for the board' },
  ],
  reputation: [
    { tag: 'REPUTATION',text: 'How has the reputation score changed?' },
    { tag: 'RISK',      text: 'Any emerging reputation risks?' },
    { tag: 'COMPARE',   text: 'How do we compare to competitors?' },
  ],
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function DashboardEngine({
  workflowId, lensId,
  brandName: brandNameProp,
  template, dashboardId, onBack,
}) {
>>>>>>> Stashed changes
  const storeBrandName = useMediaStore((s) => s.brandName);
  const storeSelected  = useMediaStore((s) => s.selectedDashboards) ?? [];
  const brandName      = brandNameProp || storeBrandName || 'Brand';

  const {
    config,
    loading: configLoading,
    error: configError,
    activeTabId,
    setActiveTabId,
    reload,
    applyConfigUpdate,
  } = useDashboardConfig(workflowId, lensId);

  const { messages, thinking, sendMessage, pendingWidgets, promotePendingWidget, dismissPendingWidget }
    = useDashboardChat(
      workflowId, lensId, applyConfigUpdate,
      (bg) => setBackground(bg),       // onBackgroundChange
      () => generateHtmlExport(),       // onHtmlExport
    );

  const [mode, setMode] = useState('preview');

<<<<<<< Updated upstream
  // ── Charts data state (from chartsApi) ────────────────────────────────────
  const [rawCharts,       setRawCharts]       = useState(null);
  const [interpretedCharts, setInterpreted]   = useState(null);
  const [chartsLoading,   setChartsLoading]   = useState(false);
  const [chartsError,     setChartsError]     = useState(null);
  const didFetchCharts = useRef(false);

  // Fetch chartsApi whenever workflowId + lensId are available
  useEffect(() => {
    if (!workflowId || !lensId) return;
    if (didFetchCharts.current) return;
    didFetchCharts.current = true;
    fetchCharts();
  }, [workflowId, lensId]);

  async function fetchCharts() {
    setChartsLoading(true);
    setChartsError(null);
    try {
      const data = await chartsApi.get(workflowId, lensId);
      setRawCharts(data);

      // Feed to AI for smart interpretation (insight texts, type overrides)
      // This is a best-effort call — if it fails we still render with raw data
      try {
        const interpreted = await aiApi.interpretCharts({
          charts: data,
          brandName,
          lensId,
          templateStyle: template?.style ?? null,
        });
        setInterpreted(interpreted?.charts ?? interpreted ?? data);
      } catch {
        // AI unavailable — render raw data directly (smart type detection still works)
        setInterpreted(data);
      }
    } catch (err) {
      setChartsError(err.message);
    } finally {
      setChartsLoading(false);
    }
  }

  // Merge template colours into API theme.
  // Template ALWAYS wins — API theme values for surface/bg are overridden
  // to ensure there is no dark theme from the config API bleeding through.
  const apiTheme = config?.theme ?? {};
  const theme = template
    ? {
        ...apiTheme,
        primaryColor:    template.primaryColor,
        secondaryColor:  template.accentColor,
        accentColor:     template.accentColor,
        backgroundColor: template.bgColor,
        textColor:       template.textColor,
        surfaceColor:    '#ffffff',          // Always white — prevents dark tab nav
        textMuted:       '#6B7280',          // Light muted text
        chartPalette:    template.palette,
        brandName:       brandName,
        designStyle:     template.style,
      }
    : {
        ...apiTheme,
        surfaceColor: apiTheme.surfaceColor ?? '#ffffff',
        brandName:    brandName,
      };

  const tplPrimary = template?.primaryColor ?? theme?.primaryColor ?? '#7C3AED';
  const tplBg     = template?.bgColor      ?? '#ffffff';
  const tplText   = template?.textColor    ?? '#111111';
=======
  // ── Template design system ────────────────────────────────────────────────
  const { design: tplDesign, cssVars: tplCssVars } = useTemplateDesign(template);

  // ── Background state (chat-controllable) ──────────────────────────────────
  // Tracks any background override set by the user via chat or upload
  const [background, setBackground] = useState({
    type: null,      // 'image' | 'video' | 'gradient' | null
    src: null,       // URL string
    target: 'page',  // 'page' | 'hero'
  });

  // ── HTML export state ─────────────────────────────────────────────────────
  const [htmlExport, setHtmlExport] = useState(null); // { url, filename } when generated
  const [exportLoading, setExportLoading] = useState(false);

  async function generateHtmlExport() {
    setExportLoading(true);
    const tid = template?.id ?? 'template_02';
    const url = `/api/media/export-html?template_id=${tid}&workflow_id=${workflowId}&lens_id=${lensId}`;
    setHtmlExport({ url, filename: `dashboard_${tid}.html` });
    setExportLoading(false);
  }

  // ── Theme — prefer extracted template design tokens over static metadata ──
  const apiTheme   = config?.theme ?? {};
  const theme = {
    ...apiTheme,
    // Use extracted design tokens (fonts, shadows, full palette) if available
    primaryColor:    tplDesign?.primary    ?? template?.primaryColor  ?? '#7C3AED',
    accentColor:     tplDesign?.accent     ?? template?.accentColor   ?? '#A78BFA',
    backgroundColor: tplDesign?.bgColor    ?? template?.bgColor       ?? '#f8f9fa',
    textColor:       tplDesign?.ink        ?? template?.textColor     ?? '#111827',
    textMuted:       tplDesign?.inkMuted   ?? '#6B7280',
    surfaceColor:    tplDesign?.surface    ?? '#ffffff',
    headingFont:     tplDesign?.headingFont ?? 'Inter',
    bodyFont:        tplDesign?.bodyFont    ?? 'Inter',
    chartPalette:    tplDesign?.chartPalette ?? template?.palette,
    shadowMd:        tplDesign?.shadowMd,
    radius:          tplDesign?.radius,
    layout:          tplDesign?.layout,
    brandName,
    designStyle:     template?.style ?? tplDesign?.name,
  };

  const tplPrimary = theme.primaryColor;
  const bgVideoUrl = background.type === 'video'
    ? background.src
    : config?.hero?.backgroundVideoUrl ?? template?.backgroundVideoUrl ?? null;
  const bgImageUrl = background.type === 'image'
    ? background.src
    : config?.hero?.backgroundImageUrl ?? template?.backgroundImageUrl ?? null;
>>>>>>> Stashed changes

  // Tab state
  const storyboard   = config?.storyboard ?? [];
  const currentTabId = activeTabId ?? storyboard[0]?.id;

<<<<<<< Updated upstream
  // ── Generate storyboard cards from chart insights ─────────────────────────
  // If config doesn't supply storyCards, build them from the interpreted charts.
  // Each chart insight becomes one narrative card.
  const IMAGE_POOL = [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
    'https://images.unsplash.com/photo-1553484771-047a44eee27a?w=400&q=80',
    'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=400&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
  ];

  const derivedStoryCards = useMemo(() => {
    if (config?.storyCards?.length) return config.storyCards;
    const charts = interpretedCharts?.charts ?? (Array.isArray(interpretedCharts) ? interpretedCharts : null);
    if (!charts?.length) return [];
    return charts
      .filter((c) => c.insight)
      .map((c, i) => ({
        title:       c.meta?.title ?? c.title ?? `Insight ${i + 1}`,
        summary:     c.insight,
        imageUrl:    IMAGE_POOL[i % IMAGE_POOL.length],
        impactScore: null,
        sentiment:   null,
        chartType:   c.type,
      }));
  }, [config?.storyCards, interpretedCharts]);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (configLoading && !config) return <DashboardSkeleton template={template} />;
  if (configError && !config)   return <DashboardError error={configError} onRetry={() => reload()} template={template} />;

  return (
    <ThemeInjector theme={theme}>
      {/* eng-shell is a full-viewport flex column; only header is sticky */}
      <div
        className="eng-shell"
        style={{ '--eng-primary': tplPrimary, '--eng-bg': tplBg, '--eng-text': tplText }}
      >
        {/* ── Sticky header ──────────────────────────────────────── */}
        <header className="eng-header" style={{ borderBottomColor: `${tplPrimary}25`, background: '#ffffff' }}>
          <div className="eng-header-left">
            <button className="eng-header-back mi-btn-icon" onClick={onBack} title="Back">
              <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
            </button>
            <div className="eng-brand-lockup">
              <span className="eng-brand-name" style={{ color: tplPrimary }}>
                {theme?.brandName ?? brandName}
              </span>
              <span className="eng-brand-style">{theme?.designStyle ?? template?.style}</span>
            </div>
          </div>

          <div className="eng-header-right">
            <motion.button
              className="eng-header-btn eng-header-btn--accent"
              onClick={() => setChatOpen(true)}
              style={{ background: `${tplPrimary}15`, color: tplPrimary, borderColor: `${tplPrimary}30` }}
              whileHover={{ scale: 1.03 }}
              title="Chat with AI"
            >
              <Sparkles size={13} />
              <span>AI Modify</span>
            </motion.button>

            <button className="eng-header-btn" onClick={() => setHistoryOpen(true)} title="Version history">
              <History size={14} />
            </button>

            <button
              className="eng-header-btn"
              onClick={() => { didFetchCharts.current = false; fetchCharts(); reload(true); }}
              title="Regenerate"
            >
              <RefreshCw size={14} className={chartsLoading ? 'mi-spin' : ''} />
            </button>

            <button className="eng-header-btn" title="Export">
              <Download size={14} />
            </button>
          </div>
        </header>

        {/* ── Scrollable body — hero + storyboard + charts ────────── */}
        <div className="eng-body">

          {/* Hero section */}
          <HeroSection
            config={config}
            brandName={theme?.brandName ?? brandName}
            template={template}
            tplPrimary={tplPrimary}
          />

          {/* Storyboard narrative cards — always shown when insights are available */}
          {derivedStoryCards.length > 0 && (
            <StoryboardSection
              cards={derivedStoryCards}
              template={template}
              tplPrimary={tplPrimary}
            />
          )}

          {/* Tab navigation */}
          {storyboard.length > 0 && (
            <StoryboardRenderer
              storyboard={storyboard}
              activeTabId={currentTabId}
              onTabChange={setActiveTabId}
              theme={theme}
            />
          )}

          {/* ── CHART DATA SECTION — primary data from chartsApi ─── */}
          <section className="eng-charts-section" style={{ background: tplBg }}>
            {chartsLoading && (
              <div className="eng-charts-loading">
                <Loader2 size={20} className="mi-spin" style={{ color: tplPrimary }} />
                <p>Loading intelligence data…</p>
              </div>
            )}

            {chartsError && !interpretedCharts && (
              <div className="eng-charts-error">
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <p>Could not load chart data: {chartsError}</p>
                <button className="mi-btn mi-btn--outline mi-btn--sm" onClick={fetchCharts}>
                  Retry
                </button>
              </div>
            )}

            {(interpretedCharts || rawCharts) && (
              <ChartDataRenderer
                chartsData={interpretedCharts ?? rawCharts}
                template={template}
                title="Intelligence Data"
              />
            )}
          </section>

          {/* Executive insights (from config, if available) */}
          {config?.executiveInsights && (
            <ExecutiveInsightsPanel
              insights={config.executiveInsights}
              theme={theme}
              tplPrimary={tplPrimary}
            />
          )}
        </div>

        {/* ── Chat sidebar ─────────────────────────────────────────── */}
        <AnimatePresence>
          {chatOpen && (
            <DashboardChat
              messages={messages}
              thinking={thinking}
              onSend={sendMessage}
              onClose={() => setChatOpen(false)}
              theme={theme}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {historyOpen && (
            <VersionHistory
              workflowId={workflowId}
              onRestore={applyConfigUpdate}
              onClose={() => setHistoryOpen(false)}
              theme={theme}
            />
          )}
        </AnimatePresence>
      </div>
=======
  // Current page widgets from config — each tab is DIFFERENT
  const currentPage    = config?.pages?.find((p) => p.tabId === currentTabId);
  const currentWidgets = currentPage?.widgets ?? [];

  // Rich storyboard chapters from charts API (stored alongside the dashboard storyboard)
  const chartsStoryboard = config?.chartsStoryboard ?? [];
  const currentTabIndex  = storyboard.findIndex((t) => t.id === currentTabId);

  // ── Left rail nav ─────────────────────────────────────────────────────────
  const leftNavItems = useMemo(() => {
    const boards = DASHBOARDS.filter((d) => storeSelected.includes(d.id));
    return [
      {
        id: 'overview',
        label: 'Overview',
        Icon: LayoutGrid,
        active: false,
        onClick: onBack,
      },
      ...boards.map((d) => ({
        id: d.id,
        label: d.name,
        Icon: LENS_ICONS[d.id] ?? BarChart2,
        active: d.id === dashboardId,
        onClick: d.id === dashboardId ? undefined : () => onBack?.(),
      })),
    ];
  }, [storeSelected, dashboardId, onBack]);

  const suggestedPrompts = LENS_PROMPTS[dashboardId] ?? LENS_PROMPTS.pr;
  const lensLabel = LENS_LABELS[dashboardId] ?? config?.theme?.designStyle ?? 'Intelligence';

  const settingsContent = (
    <ProjectSettingsPanel
      workflowId={workflowId}
      lensId={lensId}
      template={template}
      dashboards={DASHBOARDS.filter((d) => storeSelected.includes(d.id))}
      onTemplateChange={(tpl) => reload(true)}
    />
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (configLoading && !config) {
    return (
      <div className="cine-shell cine-shell--loading">
        <div className="cine-bg-img"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1448375240586-882707db888b?w=2400&q=80)' }} />
        <div className="cine-bg-overlay" />
        <div className="cine-loading-center">
          <div className="de-loading-orbs">
            {[0,1,2].map((i) => (
              <motion.div key={i} className="de-loading-orb" style={{ background: tplPrimary }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 1.6, delay: i * 0.35, repeat: Infinity }} />
            ))}
          </div>
          <p className="de-loading-text">Building your dashboard…</p>
          <div className="de-loading-steps">
            {['Fetching chart data', 'Running AI analysis', 'Generating visualisations', 'Finalising layout'].map((s, i) => (
              <motion.span key={i} className="de-loading-step"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 + 0.3 }}>
                <Loader2 size={11} className="mi-spin" style={{ color: tplPrimary }} />{s}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Hard error with no config at all — show a retry screen
  if (configError && !config) {
    return (
      <div className="cine-shell cine-shell--loading">
        <div className="cine-bg-img"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1448375240586-882707db888b?w=2400&q=80)' }} />
        <div className="cine-bg-overlay" />
        <div className="cine-loading-center">
          <AlertTriangle size={32} style={{ color: '#ef4444', marginBottom: 12 }} />
          <p style={{ color: '#fff', margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Dashboard generation failed</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, maxWidth: 360, textAlign: 'center', margin: '0 0 16px' }}>{configError}</p>
          <button className="mi-btn mi-btn--primary" onClick={() => reload()}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeInjector theme={theme}>
      <TemplateShell template={template} background={background} style={tplCssVars}>
      <CinematicShell
        mode={mode}
        onModeChange={setMode}
        brandName={brandName}
        leftNavItems={leftNavItems}
        chatMessages={messages}
        chatThinking={thinking}
        onChatSend={(msg) => sendMessage(msg, pendingWidgets)}
        backgroundVideoUrl={bgVideoUrl}
        backgroundImageUrl={bgImageUrl}
        suggestedPrompts={suggestedPrompts}
        settingsContent={settingsContent}
        onExport={generateHtmlExport}
        onShare={() => {}}
      >
        {mode === 'preview' ? (
          <PreviewContent
            lensLabel={lensLabel}
            brandName={brandName}
            storyboard={storyboard}
            currentTabId={currentTabId}
            currentTabIndex={currentTabIndex}
            setActiveTabId={setActiveTabId}
            currentWidgets={currentWidgets}
            theme={theme}
            tplPrimary={tplPrimary}
            config={config}
            configLoading={configLoading}
            onReload={() => reload(true)}
            chartsStoryboard={chartsStoryboard}
          />
        ) : (
          <ChatContent
            messages={messages}
            thinking={thinking}
            onSend={(msg) => sendMessage(msg, pendingWidgets)}
            pendingWidgets={pendingWidgets}
            storyboard={storyboard}
            onPromote={promotePendingWidget}
            onDismiss={dismissPendingWidget}
            applyConfigUpdate={applyConfigUpdate}
            workflowId={workflowId}
            lensId={lensId}
            tplPrimary={tplPrimary}
            theme={theme}
            onBackgroundChange={setBackground}
            onHtmlExport={generateHtmlExport}
          />
        )}
      </CinematicShell>
      </TemplateShell>

      {/* ── HTML Export modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {htmlExport && (
          <HtmlExportModal
            exportUrl={htmlExport.url}
            filename={htmlExport.filename}
            onClose={() => setHtmlExport(null)}
          />
        )}
      </AnimatePresence>
>>>>>>> Stashed changes
    </ThemeInjector>
  );
}

<<<<<<< Updated upstream
// ── HeroSection ───────────────────────────────────────────────────────────────
function HeroSection({ config, brandName, template, tplPrimary }) {
  const [videoPaused, setVideoPaused] = useState(false);
  const hero = config?.hero ?? {};

  const metrics = hero.metrics ?? [
    { label: 'Total Articles',  value: hero.totalArticles  ?? '—' },
    { label: 'Sentiment Score', value: hero.sentimentScore ?? '—' },
    { label: 'Audience Reach',  value: hero.audienceReach  ?? '—' },
    { label: 'PR Impact',       value: hero.prImpact       ?? '—' },
  ];

  const summary    = hero.executiveSummary ?? config?.executiveInsights?.summary ?? '';
  const dateRange  = hero.dateRange ?? '';
  const bgVideoUrl = hero.backgroundVideoUrl ?? null;
  const bgImageUrl = hero.backgroundImageUrl
    ?? 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80';

  return (
    <section className="eng-hero" style={{ '--hero-primary': tplPrimary }}>
      {bgVideoUrl ? (
        <video
          className="eng-hero-bg-video"
          src={bgVideoUrl}
          autoPlay loop muted playsInline
          style={{ display: videoPaused ? 'none' : 'block' }}
        />
      ) : (
        <div className="eng-hero-bg-img" style={{ backgroundImage: `url(${bgImageUrl})` }} />
      )}

      <div
        className="eng-hero-overlay"
        style={{
          background: template
            ? `linear-gradient(135deg, ${tplPrimary}e6 0%, ${template.accentColor ?? tplPrimary}cc 55%, ${tplPrimary}aa 100%)`
            : 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.44) 100%)',
        }}
      />

      <div className="eng-hero-content">
        <motion.div className="eng-hero-brand" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <span className="eng-hero-eyebrow">Media Intelligence Platform</span>
          <h1 className="eng-hero-title">{brandName}</h1>
          {dateRange && <span className="eng-hero-date">{dateRange}</span>}
        </motion.div>

        <motion.div className="eng-hero-metrics" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }}>
          {metrics.map((m, i) => <HeroMetric key={i} label={m.label} value={m.value} delta={m.delta} />)}
        </motion.div>

        {summary && (
          <motion.div className="eng-hero-summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}>
            <Sparkles size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
            <p>{summary}</p>
          </motion.div>
        )}
      </div>

      {bgVideoUrl && (
        <button className="eng-hero-video-ctrl" onClick={() => setVideoPaused((p) => !p)} title={videoPaused ? 'Play' : 'Pause'}>
          {videoPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}
    </section>
  );
}

function HeroMetric({ label, value, delta }) {
  const isUp = delta && !String(delta).startsWith('−') && !String(delta).startsWith('-');
  return (
    <div className="eng-hero-metric">
      <span className="eng-hero-metric-val">{value}</span>
      <span className="eng-hero-metric-label">{label}</span>
      {delta && (
        <span className={`eng-hero-metric-delta ${isUp ? 'eng-hero-metric-delta--up' : 'eng-hero-metric-delta--down'}`}>
          {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {delta}
        </span>
      )}
    </div>
  );
}

// ── StoryboardSection ─────────────────────────────────────────────────────────
function StoryboardSection({ cards, template, tplPrimary }) {
  const tplBg   = template?.bgColor ?? '#f8f9fa';
  const tplText = template?.textColor ?? '#111111';

=======
// ── HTML Export modal ─────────────────────────────────────────────────────────
function HtmlExportModal({ exportUrl, filename, onClose }) {
  return (
    <>
      <motion.div className="am-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0 }} onClick={onClose} />
      <div className="am-modal-wrapper" onClick={onClose}>
        <motion.div className="am-modal hem-modal" onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.22 }}>
          <div className="am-header">
            <div className="am-header-left">
              <span className="am-eyebrow">HTML EXPORT</span>
              <h2 className="am-title">Preview & Download</h2>
            </div>
            <button className="am-close" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="hem-preview-frame">
            <iframe src={exportUrl} title="HTML Preview" className="hem-iframe"
              sandbox="allow-scripts allow-same-origin" />
          </div>
          <div className="hem-footer">
            <p className="hem-hint">This HTML file contains the template design + real API data.</p>
            <div className="hem-actions">
              <a href={exportUrl} target="_blank" rel="noreferrer" className="hem-preview-btn">
                Open in new tab ↗
              </a>
              <a href={`${exportUrl}&download=1`} download={filename} className="hem-download-btn">
                <Download size={14} /> Download HTML
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ── Preview Content — config-driven widget grid ────────────────────────────────
function PreviewContent({
  lensLabel, brandName, storyboard, currentTabId, currentTabIndex, setActiveTabId,
  currentWidgets, theme, tplPrimary, config, configLoading, onReload, chartsStoryboard,
}) {
  const currentTab = storyboard.find((t) => t.id === currentTabId);

  function navigateToTabIndex(idx) {
    const tab = storyboard[idx];
    if (tab) setActiveTabId(tab.id);
  }

>>>>>>> Stashed changes
  return (
    <div className="de-page">
      {/* Page header */}
      <div className="de-page-header">
        <div>
          <h1 className="de-page-title">{lensLabel}</h1>
          <p className="de-page-sub">{brandName}</p>
        </div>
        <div className="de-page-header-actions">
          {configLoading && (
            <span className="de-page-refreshing">
              <Loader2 size={12} className="mi-spin" style={{ color: tplPrimary }} />
              Updating…
            </span>
          )}
          <button className="co-period-btn" onClick={onReload} title="Regenerate dashboard">
            <RefreshCw size={12} />
            Regenerate
          </button>
          <button className="co-period-btn">
            <Calendar size={13} />
            Weekly
          </button>
        </div>
      </div>

<<<<<<< Updated upstream
      <div className="eng-story-section-grid">
        {cards.map((card, i) => {
          const img = card.imageUrl ?? IMAGE_POOL[i % IMAGE_POOL.length];
          const sentPos = card.sentimentScore >= 0 || card.sentiment === 'positive';
          return (
            <motion.div key={i} className="eng-story-card"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.09, duration: 0.42 }}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}>
              <div className="eng-story-card-img-wrap">
                <img src={img} alt={card.title} className="eng-story-card-img" loading="lazy" />
                <div className="eng-story-card-img-overlay" style={{ background: `${tplPrimary}44` }} />
                {card.impactScore && (
                  <div className="eng-story-card-impact" style={{ background: tplPrimary }}>{card.impactScore}</div>
                )}
              </div>
              <div className="eng-story-card-body" style={{ color: tplText }}>
                <h3 className="eng-story-card-title">{card.title}</h3>
                <p className="eng-story-card-summary">{card.summary}</p>
                <div className="eng-story-card-meta">
                  {card.articles && (
                    <span className="eng-story-card-stat">
                      <span className="eng-story-card-stat-val">{card.articles}</span>
                      <span className="eng-story-card-stat-label">articles</span>
                    </span>
                  )}
                  {card.sentiment !== undefined && (
                    <span className={`eng-story-card-sentiment ${sentPos ? 'eng-story-card-sentiment--pos' : 'eng-story-card-sentiment--neg'}`}>
                      {sentPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {card.sentiment}
                    </span>
                  )}
                </div>
                <button className="eng-story-card-cta" style={{ color: tplPrimary }}>
                  Explore narrative <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
=======
      {/* ── Storyboard 3-panel navigation ─────────────────────── */}
      <StoryboardNav
        chartsStoryboard={chartsStoryboard}
        currentTabIndex={currentTabIndex}
        onNavigate={navigateToTabIndex}
        primaryColor={tplPrimary}
      />

      {/* Tab navigation — from config.storyboard (data-driven) */}
      {storyboard.length > 0 && (
        <div className="de-tab-nav">
          {storyboard.map((tab) => (
            <button
              key={tab.id}
              className={`de-tab-btn ${tab.id === currentTabId ? 'de-tab-btn--active' : ''}`}
              style={tab.id === currentTabId ? { color: tplPrimary, borderColor: tplPrimary } : {}}
              onClick={() => setActiveTabId(tab.id)}
              title={tab.subtitle ?? ''}
            >
              {tab.icon && <span className="de-tab-icon">{tab.icon}</span>}
              {tab.title}
            </button>
          ))}
        </div>
      )}

      {/* Widget grid — each tab renders its own unique set of widgets */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTabId}
          className="de-widget-grid"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {currentWidgets.length === 0 && !configLoading && (
            <EmptyTabState tabTitle={currentTab?.title ?? 'this tab'} tplPrimary={tplPrimary} />
          )}
          {currentWidgets.map((widget, i) => (
            <WidgetRenderer key={widget.id} widget={widget} theme={theme} index={i} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Executive insights panel — shown on first tab */}
      {currentTabId === storyboard[0]?.id && config?.executiveInsights && (
        <ExecutiveInsights insights={config.executiveInsights} tplPrimary={tplPrimary} />
      )}

      {/* ── Continue to next chapter banner ───────────────────── */}
      <StoryboardContinueBanner
        chartsStoryboard={chartsStoryboard}
        currentTabIndex={currentTabIndex}
        onNavigate={navigateToTabIndex}
        primaryColor={tplPrimary}
      />
    </div>
>>>>>>> Stashed changes
  );
}

// ── Empty tab state ────────────────────────────────────────────────────────────
function EmptyTabState({ tabTitle, tplPrimary }) {
  return (
    <div className="de-empty-tab" style={{ gridColumn: '1 / -1' }}>
      <div className="de-empty-tab-icon" style={{ background: `${tplPrimary}15` }}>
        <Sparkles size={22} style={{ color: tplPrimary }} />
      </div>
      <h3>No content for {tabTitle}</h3>
      <p>The AI didn't generate widgets for this tab, or it's waiting for data.<br />
        Try asking in Chat Mode to add charts here.</p>
    </div>
  );
}

// ── Executive Insights ─────────────────────────────────────────────────────────
function ExecutiveInsights({ insights, tplPrimary }) {
  return (
    <div className="eng-exec-panel">
      <div className="eng-exec-header">
        <span className="eng-exec-badge" style={{ background: `${tplPrimary}15`, color: tplPrimary }}>
          ✦ Executive Intelligence
        </span>
      </div>
      {insights.summary && <p className="eng-exec-summary">{insights.summary}</p>}
      <div className="eng-exec-grid">
        {insights.keyFindings?.length > 0 && (
          <div className="eng-exec-section">
            <h4 className="eng-exec-section-title">Key Findings</h4>
            {insights.keyFindings.map((f, i) => (
              <div key={i} className="eng-exec-item eng-exec-item--finding">
                <span className="eng-exec-item-dot" style={{ background: tplPrimary }} />{f}
              </div>
            ))}
          </div>
        )}
        {insights.recommendations?.length > 0 && (
          <div className="eng-exec-section">
            <h4 className="eng-exec-section-title">Recommendations</h4>
            {insights.recommendations.map((r, i) => (
<<<<<<< Updated upstream
              <div key={i} className="eng-exec-item eng-exec-item--rec">
                <span className="eng-exec-item-dot" style={{ background: theme?.accentColor ?? tplPrimary }} />{r}
=======
              <div key={i} className="eng-exec-item">
                <span className="eng-exec-item-dot" style={{ background: tplPrimary }} />{r}
>>>>>>> Stashed changes
              </div>
            ))}
          </div>
        )}
        {insights.risks?.length > 0 && (
          <div className="eng-exec-section">
            <h4 className="eng-exec-section-title">Risks to Monitor</h4>
            {insights.risks.map((r, i) => (
              <div key={i} className="eng-exec-item eng-exec-item--risk">
                <span className="eng-exec-item-dot" style={{ background: '#ef4444' }} />{r}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

<<<<<<< Updated upstream
// ── Loading / Error states ────────────────────────────────────────────────────
function DashboardSkeleton({ template }) {
  const tplPrimary = template?.primaryColor ?? '#7C3AED';
  const tplBg     = template?.bgColor      ?? '#f8f9fa';
  return (
    <div className="eng-shell" style={{ background: tplBg, '--eng-bg': tplBg }}>
      <div className="eng-generating-state">
        <div className="eng-gen-orbs">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="eng-gen-orb" style={{ background: tplPrimary }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.6, delay: i * 0.35, repeat: Infinity }} />
          ))}
        </div>
        <h2 className="eng-gen-title" style={{ color: '#111' }}>Building your dashboard…</h2>
        <p className="eng-gen-sub" style={{ color: '#666' }}>Applying template theme and fetching intelligence data</p>
        <div className="eng-gen-steps">
          {['Applying template', 'Fetching chart data', 'AI analysis', 'Building visualisations'].map((s, i) => (
            <motion.div key={i} className="eng-gen-step"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 + 0.5 }}>
              <Loader2 size={12} className="mi-spin" style={{ color: tplPrimary }} />
              <span style={{ color: '#555' }}>{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
=======
// ── Chat Content (Chat Mode) ───────────────────────────────────────────────────
// Full conversational UI. AI responses can include chatWidgets previewed inline.
// User must manually "Add to Dashboard" — nothing auto-applies.

const DEFAULT_QUESTIONS = [
  { emoji: '📊', text: 'Show me the sentiment trend as a chart in the Overview tab' },
  { emoji: '🏆', text: 'Add a top publications chart to the Media Coverage tab' },
  { emoji: '🔥', text: 'Which themes are driving the most coverage? Show as a chart' },
  { emoji: '📱', text: 'Create an executive summary insight for the Key Stories tab' },
];

function ChatContent({
  messages, thinking, onSend,
  pendingWidgets, storyboard, onPromote, onDismiss,
  applyConfigUpdate, workflowId, lensId, tplPrimary, theme,
  onBackgroundChange, onHtmlExport,
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, pendingWidgets]);

  function submit(text) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');
    onSend(msg);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch('/api/media/upload-background', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        onBackgroundChange?.({ type: data.type, src: data.url, target: 'page' });
        onSend(`Background updated to uploaded ${data.type}: ${data.url}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }
>>>>>>> Stashed changes

  return (
    <div className="cc-root">
      {/* Messages area */}
      <div className="cc-messages">
        {messages.length === 0 && (
          <motion.div className="cc-empty"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="cc-empty-title">What would you like to know?</h2>
            <p className="cc-empty-sub">
              Ask me to show charts, add them to specific tabs, or modify the dashboard.
              Charts will appear here first — you decide what goes on the dashboard.
            </p>
            <div className="cc-suggestion-grid">
              {DEFAULT_QUESTIONS.map((q, i) => (
                <motion.button key={i} className="cc-suggestion-tile"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => submit(q.text)}>
                  <span className="cc-tile-emoji">{q.emoji}</span>
                  <span>{q.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            storyboard={storyboard}
            onPromote={onPromote}
            onDismiss={onDismiss}
            workflowId={workflowId}
            lensId={lensId}
            applyConfigUpdate={applyConfigUpdate}
            tplPrimary={tplPrimary}
            theme={theme}
          />
        ))}

        {thinking && (
          <div className="cc-msg cc-msg--assistant">
            <div className="cc-bubble cc-bubble--thinking">
              <span className="co-thinking-dot" />
              <span className="co-thinking-dot" />
              <span className="co-thinking-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick action chips */}
      <div className="cc-quick-actions">
        <button className="cc-quick-chip" onClick={() => fileRef.current?.click()}
          title="Upload background image or video" disabled={uploading}>
          {uploading ? <Loader2 size={11} className="mi-spin" /> : '🖼️'}
          {uploading ? 'Uploading…' : 'Upload BG'}
        </button>
        <button className="cc-quick-chip" onClick={onHtmlExport}
          title="Generate & download HTML file">
          📄 Export HTML
        </button>
        <button className="cc-quick-chip"
          onClick={() => submit('Change the background to a dark gradient')}>
          🎨 Dark BG
        </button>
        <button className="cc-quick-chip"
          onClick={() => submit('Show me the sentiment trend chart')}>
          📊 Show chart
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm"
          style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>

      {/* Input bar */}
      <div className="cc-input-bar">
        <input
          ref={inputRef}
          className="cc-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
          placeholder="Ask to change background, add charts, export HTML…"
          disabled={thinking}
        />
        <button
          className="cc-send-btn"
          onClick={() => submit()}
          disabled={!input.trim() || thinking}
          style={{ background: tplPrimary }}
        >
          {thinking ? <Loader2 size={14} className="mi-spin" /> : <span>↑</span>}
        </button>
      </div>
    </div>
  );
}

// ── Single chat message with optional inline chart widgets ────────────────────
function ChatMessage({ msg, storyboard, onPromote, onDismiss, workflowId, lensId, applyConfigUpdate, tplPrimary, theme }) {
  const isUser = msg.role === 'user';
  const chatWidgets = msg.chatWidgets ?? [];

  return (
    <motion.div
      className={`cc-msg cc-msg--${msg.role}`}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Message bubble */}
      <div className={`cc-bubble ${msg.error ? 'cc-bubble--error' : ''}`}
        style={isUser ? { background: `${tplPrimary}18`, color: theme?.textColor } : {}}>
        {msg.content}
        {msg.changesApplied > 0 && (
          <span className="cc-changes-badge" style={{ background: `${tplPrimary}20`, color: tplPrimary }}>
            <Check size={10} /> {msg.changesApplied} change{msg.changesApplied !== 1 ? 's' : ''} applied to dashboard
          </span>
        )}
      </div>

      {/* Inline chart previews — only shown for assistant messages */}
      {!isUser && chatWidgets.length > 0 && (
        <div className="cc-widgets-preview">
          {chatWidgets.map((cw) => (
            <ChatWidgetPreview
              key={cw.previewId}
              cw={cw}
              storyboard={storyboard}
              onPromote={onPromote}
              onDismiss={onDismiss}
              workflowId={workflowId}
              lensId={lensId}
              applyConfigUpdate={applyConfigUpdate}
              tplPrimary={tplPrimary}
              theme={theme}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Inline chart widget card in the chat conversation ─────────────────────────
function ChatWidgetPreview({ cw, storyboard, onPromote, onDismiss, workflowId, lensId, applyConfigUpdate, tplPrimary, theme }) {
  const [selectedTab, setSelectedTab] = useState(cw.tabId ?? storyboard[0]?.id ?? '');
  const [adding, setAdding]       = useState(false);
  const [added, setAdded]         = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const tabLabel = storyboard.find((t) => t.id === selectedTab)?.title ?? cw.tabLabel ?? selectedTab;

  async function addToDashboard() {
    setAdding(true);
    try {
      const res = await fetch(
        `/api/dashboard/${workflowId}/add-widget?lens_id=${lensId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabId: selectedTab, widget: cw.widget, label: `Chat: ${cw.widget.title}` }),
        }
      );
      const data = await res.json();
      if (data.config) {
        applyConfigUpdate(data.config);
        onPromote?.(cw.previewId);
        setAdded(true);
      }
    } catch (err) {
      console.error('addToDashboard failed:', err);
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div
      className={`cc-widget-card ${added ? 'cc-widget-card--added' : ''}`}
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mini widget preview */}
      <div className="cc-widget-preview-area">
        <WidgetRenderer widget={cw.widget} theme={theme} index={0} />
      </div>

      {/* Action bar */}
      {!added ? (
        <div className="cc-widget-actions">
          <span className="cc-widget-action-label">Add to tab:</span>

          {/* Tab selector */}
          <div className="cc-tab-select-wrap">
            <select
              className="cc-tab-select"
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
            >
              {storyboard.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <ChevronDown size={11} className="cc-tab-select-icon" />
          </div>

          <button
            className="cc-add-btn"
            style={{ background: tplPrimary }}
            onClick={addToDashboard}
            disabled={adding}
          >
            {adding
              ? <><Loader2 size={11} className="mi-spin" /> Adding…</>
              : <><Plus size={11} /> Add to {tabLabel}</>
            }
          </button>

          <button className="cc-dismiss-btn" onClick={() => { setDismissed(true); onDismiss?.(cw.previewId); }}
            title="Dismiss">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="cc-widget-added-confirm">
          <Check size={13} style={{ color: '#16a34a' }} />
          <span>Added to <strong>{tabLabel}</strong> — switch to Preview Mode to see it</span>
        </div>
      )}
    </motion.div>
  );
}
