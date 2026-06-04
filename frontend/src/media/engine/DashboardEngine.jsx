/**
 * DashboardEngine — Primary dashboard renderer.
 *
 * Data flow:
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
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
import { useDashboardConfig, useDashboardChat } from '../hooks/useDashboardConfig';

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardEngine({ workflowId, lensId, brandName: brandNameProp, template, dashboardId, onBack }) {
  // brandName from store as authoritative source (prop may be stale on direct URL navigation)
  const storeBrandName = useMediaStore((s) => s.brandName);
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

  const { messages, thinking, sendMessage } = useDashboardChat(workflowId, applyConfigUpdate);

  const [chatOpen,    setChatOpen]    = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  // Tab state
  const storyboard   = config?.storyboard ?? [];
  const currentTabId = activeTabId ?? storyboard[0]?.id;

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
    </ThemeInjector>
  );
}

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

  return (
    <section className="eng-story-section" style={{ background: tplBg }}>
      <div className="eng-story-section-header">
        <div>
          <h2 className="eng-story-section-title" style={{ color: tplText }}>Storyboard</h2>
          <p className="eng-story-section-sub">AI-curated intelligence narratives</p>
        </div>
        <div className="eng-story-section-accent" style={{ background: tplPrimary }} />
      </div>

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
  );
}

// ── Executive Insights ────────────────────────────────────────────────────────
function ExecutiveInsightsPanel({ insights, theme, tplPrimary }) {
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
              <div key={i} className="eng-exec-item eng-exec-item--rec">
                <span className="eng-exec-item-dot" style={{ background: theme?.accentColor ?? tplPrimary }} />{r}
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

function DashboardError({ error, onRetry, template }) {
  return (
    <div className="eng-shell" style={{ background: template?.bgColor ?? '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="eng-error-state">
        <AlertTriangle size={32} style={{ color: '#ef4444' }} />
        <h3 style={{ color: '#111' }}>Dashboard generation failed</h3>
        <p style={{ color: '#666' }}>{error}</p>
        <button className="mi-btn mi-btn--primary" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}
