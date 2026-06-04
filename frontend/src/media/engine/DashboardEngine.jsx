/**
 * DashboardEngine — Main orchestrator for the AI-driven dashboard.
 *
 * Sections (in order):
 *  1. HeroSection      — Full-width video/image hero with brand metrics + exec summary
 *  2. StoryboardSection — Narrative intelligence cards with images
 *  3. ThemeInjector    — Injects template CSS variables
 *  4. StoryboardRenderer — Tab navigation
 *  5. LayoutRenderer   — Page layout grid
 *  6. InsightPanel     — Executive insights
 *
 * Theme source: selectedTemplate from store → overrides everything.
 * NO dark theme anywhere.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, MessageSquare, History, Loader2, AlertTriangle,
  Download, Sparkles, Play, Pause, ArrowRight, TrendingUp, TrendingDown
} from 'lucide-react';
import { ThemeInjector }       from './ThemeInjector';
import { StoryboardRenderer }  from './StoryboardRenderer';
import { LayoutRenderer }      from './LayoutRenderer';
import { DashboardChat }       from '../components/DashboardChat';
import { VersionHistory }      from '../components/VersionHistory';
import { useDashboardConfig, useDashboardChat } from '../hooks/useDashboardConfig';

export default function DashboardEngine({ workflowId, lensId, brandName, template, dashboardId, onBack }) {
  const {
    config,
    loading,
    error,
    activeTabId,
    setActiveTabId,
    reload,
    applyConfigUpdate,
  } = useDashboardConfig(workflowId, lensId);

  const { messages, thinking, sendMessage } = useDashboardChat(workflowId, applyConfigUpdate);

  const [chatOpen,    setChatOpen]    = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Merge template colours into theme (template wins over API theme)
  const apiTheme   = config?.theme ?? {};
  const theme = template
    ? {
        ...apiTheme,
        primaryColor:   template.primaryColor,
        secondaryColor: template.accentColor,
        accentColor:    template.accentColor,
        backgroundColor: template.bgColor,
        textColor:      template.textColor,
        chartPalette:   template.palette,
        fontPair:       apiTheme.fontPair,
        brandName:      apiTheme.brandName ?? brandName,
        designStyle:    template.style,
      }
    : apiTheme;

  const storyboard   = config?.storyboard ?? [];
  const currentTabId = activeTabId ?? storyboard[0]?.id;
  const currentTab   = storyboard.find((t) => t.id === currentTabId) ?? storyboard[0];
  const currentPage  = (config?.pages ?? []).find((p) => p.tabId === currentTabId);

  if (loading) return <DashboardSkeleton template={template} />;
  if (error)   return <DashboardError error={error} onRetry={() => reload()} template={template} />;
  if (!config) return null;

  const tplPrimary = template?.primaryColor ?? theme?.primaryColor ?? '#7C3AED';
  const tplBg     = template?.bgColor ?? '#ffffff';
  const tplText   = template?.textColor ?? '#111111';

  return (
    <ThemeInjector theme={theme}>
      <div
        className="eng-shell"
        style={{ '--eng-primary': tplPrimary, '--eng-bg': tplBg, '--eng-text': tplText, background: tplBg }}
      >
        {/* ── Top header bar ─────────────────────────────────────────────── */}
        <header
          className="eng-header"
          style={{
            borderBottomColor: `${tplPrimary}25`,
            background: '#ffffff',
            color: tplText,
          }}
        >
          <div className="eng-header-left">
            <button className="eng-header-back mi-btn-icon" onClick={onBack} title="Back">
              <span style={{ fontSize: 18 }}>←</span>
            </button>
            <div className="eng-brand-lockup">
              <span className="eng-brand-name" style={{ color: tplPrimary }}>
                {theme?.brandName ?? brandName}
              </span>
              <span className="eng-brand-style">{theme?.designStyle}</span>
            </div>
          </div>

          <div className="eng-header-right">
            <motion.button
              className="eng-header-btn eng-header-btn--accent"
              onClick={() => setChatOpen(true)}
              style={{ background: `${tplPrimary}15`, color: tplPrimary, borderColor: `${tplPrimary}30` }}
              whileHover={{ scale: 1.03 }}
              title="Chat with AI to modify dashboard"
            >
              <Sparkles size={13} />
              <span>AI Modify</span>
            </motion.button>

            <button className="eng-header-btn" onClick={() => setHistoryOpen(true)} title="Version history">
              <History size={14} />
            </button>

            <button className="eng-header-btn" onClick={() => reload(true)} title="Regenerate">
              <RefreshCw size={14} className={loading ? 'mi-spin' : ''} />
            </button>

            <button className="eng-header-btn" title="Export">
              <Download size={14} />
            </button>
          </div>
        </header>

        {/* ── 1. HERO SECTION ────────────────────────────────────────────── */}
        <HeroSection
          config={config}
          brandName={theme?.brandName ?? brandName}
          template={template}
          tplPrimary={tplPrimary}
        />

        {/* ── 2. STORYBOARD SECTION ──────────────────────────────────────── */}
        {config.storyCards && config.storyCards.length > 0 && (
          <StoryboardSection
            cards={config.storyCards}
            template={template}
            tplPrimary={tplPrimary}
          />
        )}

        {/* ── Layer 2: Tab navigation ────────────────────────────────────── */}
        <StoryboardRenderer
          storyboard={storyboard}
          activeTabId={currentTabId}
          onTabChange={setActiveTabId}
          theme={theme}
        />

        {/* ── Main content area ──────────────────────────────────────────── */}
        <div className="eng-content" style={{ background: tplBg }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTabId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              className="eng-page"
            >
              <LayoutRenderer
                page={currentPage}
                storyboardTab={currentTab}
                theme={theme}
              />

              {currentTab?.layout === 'hero' && config.executiveInsights && (
                <ExecutiveInsightsPanel insights={config.executiveInsights} theme={theme} tplPrimary={tplPrimary} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Chat sidebar ──────────────────────────────────────────────── */}
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

  // Metrics to display
  const metrics = hero.metrics ?? [
    { label: 'Total Articles',    value: hero.totalArticles    ?? '—' },
    { label: 'Sentiment Score',   value: hero.sentimentScore   ?? '—' },
    { label: 'Audience Reach',    value: hero.audienceReach    ?? '—' },
    { label: 'PR Impact',        value: hero.prImpact          ?? '—' },
  ];

  const summary = hero.executiveSummary ?? config?.executiveInsights?.summary ?? '';
  const dateRange = hero.dateRange ?? '';

  const heroStyle = template?.heroStyle ?? 'gradient-hero';
  const tplBg     = template?.bgColor ?? '#ffffff';
  const textColor = template?.textColor ?? '#111111';

  // Background — video preferred, then image, then CSS gradient
  const bgVideoUrl  = hero.backgroundVideoUrl ?? null;
  const bgImageUrl  = hero.backgroundImageUrl
    ?? `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80`;

  return (
    <section
      className="eng-hero"
      style={{ '--hero-primary': tplPrimary, '--hero-bg': tplBg, '--hero-text': textColor }}
    >
      {/* Background video or image */}
      {bgVideoUrl ? (
        <video
          className="eng-hero-bg-video"
          src={bgVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          paused={videoPaused || undefined}
        />
      ) : (
        <div
          className="eng-hero-bg-img"
          style={{ backgroundImage: `url(${bgImageUrl})` }}
        />
      )}

      {/* Colour overlay derived from template */}
      <div
        className="eng-hero-overlay"
        style={{
          background: template
            ? `linear-gradient(135deg, ${tplPrimary}e6 0%, ${template.accentColor ?? tplPrimary}cc 50%, ${tplPrimary}99 100%)`
            : 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      <div className="eng-hero-content">
        {/* Brand + title */}
        <motion.div
          className="eng-hero-brand"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="eng-hero-eyebrow">Media Intelligence Platform</span>
          <h1 className="eng-hero-title">{brandName}</h1>
          {dateRange && <span className="eng-hero-date">{dateRange}</span>}
        </motion.div>

        {/* Metrics row */}
        <motion.div
          className="eng-hero-metrics"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {metrics.map((m, i) => (
            <HeroMetric key={i} label={m.label} value={m.value} delta={m.delta} />
          ))}
        </motion.div>

        {/* Executive summary */}
        {summary && (
          <motion.div
            className="eng-hero-summary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Sparkles size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
            <p>{summary}</p>
          </motion.div>
        )}
      </div>

      {/* Video pause toggle */}
      {bgVideoUrl && (
        <button
          className="eng-hero-video-ctrl"
          onClick={() => setVideoPaused((p) => !p)}
          title={videoPaused ? 'Play' : 'Pause'}
        >
          {videoPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}
    </section>
  );
}

function HeroMetric({ label, value, delta }) {
  const isUp = delta && !delta.startsWith('−') && !delta.startsWith('-');
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
  const tplBg    = template?.bgColor ?? '#f8f9fa';
  const tplText  = template?.textColor ?? '#111111';

  return (
    <section
      className="eng-storyboard"
      style={{ '--sb-primary': tplPrimary, '--sb-bg': tplBg, '--sb-text': tplText, background: tplBg }}
    >
      <div className="eng-storyboard-header">
        <div>
          <h2 className="eng-storyboard-title" style={{ color: tplText }}>Storyboard</h2>
          <p className="eng-storyboard-sub">AI-curated intelligence narratives</p>
        </div>
        <div className="eng-storyboard-accent" style={{ background: tplPrimary }} />
      </div>

      <div className="eng-storyboard-grid">
        {cards.map((card, i) => (
          <StoryCard key={i} card={card} index={i} tplPrimary={tplPrimary} tplText={tplText} />
        ))}
      </div>
    </section>
  );
}

function StoryCard({ card, index, tplPrimary, tplText }) {
  const imageUrl = card.imageUrl
    ?? `https://images.unsplash.com/photo-${1504711434969 + index * 111}?w=400&q=80`;
  // Fallback image pool
  const IMAGE_POOL = [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
    'https://images.unsplash.com/photo-1553484771-047a44eee27a?w=400&q=80',
    'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=400&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
  ];
  const img = card.imageUrl ?? IMAGE_POOL[index % IMAGE_POOL.length];
  const sentimentPositive = card.sentimentScore >= 0 || card.sentiment === 'positive';

  return (
    <motion.div
      className="eng-story-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.45 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Image */}
      <div className="eng-story-card-img-wrap">
        <img src={img} alt={card.title} className="eng-story-card-img" loading="lazy" />
        <div
          className="eng-story-card-img-overlay"
          style={{ background: `${tplPrimary}44` }}
        />
        {card.impactScore && (
          <div className="eng-story-card-impact" style={{ background: tplPrimary }}>
            {card.impactScore}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="eng-story-card-body" style={{ color: tplText }}>
        <h3 className="eng-story-card-title">{card.title}</h3>
        <p className="eng-story-card-summary">{card.summary}</p>

        {/* Metrics row */}
        <div className="eng-story-card-meta">
          {card.articles && (
            <span className="eng-story-card-stat">
              <span className="eng-story-card-stat-val">{card.articles}</span>
              <span className="eng-story-card-stat-label">articles</span>
            </span>
          )}
          {card.sentiment !== undefined && (
            <span className={`eng-story-card-sentiment ${sentimentPositive ? 'eng-story-card-sentiment--pos' : 'eng-story-card-sentiment--neg'}`}>
              {sentimentPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {card.sentiment}
            </span>
          )}
        </div>

        {/* CTA */}
        <button className="eng-story-card-cta" style={{ color: tplPrimary }}>
          Explore narrative <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Executive Insights Panel ──────────────────────────────────────────────────
function ExecutiveInsightsPanel({ insights, theme, tplPrimary }) {
  return (
    <div className="eng-exec-panel" style={{ '--exec-primary': tplPrimary }}>
      <div className="eng-exec-header">
        <span className="eng-exec-badge" style={{ background: `${tplPrimary}15`, color: tplPrimary }}>
          ✦ Executive Intelligence
        </span>
      </div>

      {insights.summary && (
        <p className="eng-exec-summary">{insights.summary}</p>
      )}

      <div className="eng-exec-grid">
        {insights.keyFindings?.length > 0 && (
          <div className="eng-exec-section">
            <h4 className="eng-exec-section-title">Key Findings</h4>
            {insights.keyFindings.map((f, i) => (
              <div key={i} className="eng-exec-item eng-exec-item--finding">
                <span className="eng-exec-item-dot" style={{ background: tplPrimary }} />
                {f}
              </div>
            ))}
          </div>
        )}
        {insights.recommendations?.length > 0 && (
          <div className="eng-exec-section">
            <h4 className="eng-exec-section-title">Recommendations</h4>
            {insights.recommendations.map((r, i) => (
              <div key={i} className="eng-exec-item eng-exec-item--rec">
                <span className="eng-exec-item-dot" style={{ background: theme?.accentColor ?? tplPrimary }} />
                {r}
              </div>
            ))}
          </div>
        )}
        {insights.risks?.length > 0 && (
          <div className="eng-exec-section">
            <h4 className="eng-exec-section-title">Risks to Monitor</h4>
            {insights.risks.map((r, i) => (
              <div key={i} className="eng-exec-item eng-exec-item--risk">
                <span className="eng-exec-item-dot" style={{ background: '#ef4444' }} />
                {r}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────
function DashboardSkeleton({ template }) {
  const tplPrimary = template?.primaryColor ?? '#7C3AED';
  const tplBg     = template?.bgColor ?? '#f8f9fa';
  return (
    <div className="eng-shell" style={{ background: tplBg }}>
      <div className="eng-generating-state">
        <div className="eng-gen-orbs">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="eng-gen-orb"
              style={{ background: tplPrimary }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.6, delay: i * 0.35, repeat: Infinity }}
            />
          ))}
        </div>
        <h2 className="eng-gen-title" style={{ color: '#111' }}>Generating your brand dashboard…</h2>
        <p className="eng-gen-sub" style={{ color: '#666' }}>AI is crafting a unique experience for your brand</p>
        <div className="eng-gen-steps">
          {['Applying template theme', 'Mapping brand data', 'Building hero section', 'Generating storyboard', 'Building visualisations'].map((s, i) => (
            <motion.div key={i} className="eng-gen-step"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 + 0.5 }}>
              <Loader2 size={12} className="mi-spin" style={{ color: tplPrimary }} />
              <span style={{ color: '#444' }}>{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry, template }) {
  const tplBg = template?.bgColor ?? '#f8f9fa';
  return (
    <div className="eng-shell" style={{ background: tplBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
