/**
 * WidgetRenderer — renders any widget type from the dashboard config.
 *
 * Features:
 *  - ChartWidget shows a 2-line insight below the chart (widget.insight)
 *  - ChartWidget shows an "Analysis" button → opens a portal modal
 *  - Modal design: eyebrow + bold title + insight headline + numbered KEY INSIGHTS cards
 *  - ChartWidget passes dateInsights to DynamicChart for spike dot markers
 *  - KpiCard shows insight text if present
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart2, X, Sparkles } from 'lucide-react';
import { ChartErrorBoundary } from '../components/ChartErrorBoundary';
import { DynamicChart }       from './charts/DynamicChart';

const itemVariant = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export function WidgetRenderer({ widget, theme, index = 0 }) {
  return (
    <motion.div
      variants={itemVariant}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.05 }}
      className={`eng-widget eng-widget--${widget.type} eng-span-${widget.span ?? 1}`}
      data-widget-id={widget.id}
    >
      <WidgetContent widget={widget} theme={theme} />
    </motion.div>
  );
}

function WidgetContent({ widget, theme }) {
  switch (widget.type) {
    case 'hero-banner': return <HeroBannerWidget widget={widget} theme={theme} />;
    case 'kpi-card':    return <KpiCardWidget    widget={widget} theme={theme} />;
    case 'chart':       return <ChartWidget      widget={widget} theme={theme} />;
    case 'insight':     return <InsightWidget    widget={widget} theme={theme} />;
    case 'narrative':   return <NarrativeWidget  widget={widget} theme={theme} />;
    default:            return <GenericWidget    widget={widget} />;
  }
}

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBannerWidget({ widget, theme }) {
  const { headline, subline } = widget;
  return (
    <div className="eng-hero" style={{
      background: `linear-gradient(135deg, ${theme?.primaryColor ?? '#7C3AED'}18, ${theme?.accentColor ?? '#A78BFA'}10)`,
      borderLeft: `4px solid ${theme?.primaryColor ?? '#7C3AED'}`,
    }}>
      <div className="eng-hero-content">
        <span className="eng-hero-eyebrow" style={{ color: theme?.primaryColor }}>{theme?.brandName}</span>
        <h2 className="eng-hero-headline">{headline ?? widget.title}</h2>
        {subline && <p className="eng-hero-subline">{subline}</p>}
      </div>
      <div className="eng-hero-badge" style={{ background: theme?.primaryColor ?? '#7C3AED' }}>
        <span className="eng-hero-badge-text">Intelligence Report</span>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCardWidget({ widget, theme }) {
  const { value, label, delta, deltaPos, icon, insight } = widget;
  const DeltaIcon  = deltaPos === false ? TrendingDown : deltaPos === true ? TrendingUp : Minus;
  const deltaColor = deltaPos === false ? 'var(--mi-negative)' : deltaPos === true ? 'var(--mi-positive)' : 'var(--mi-text-3)';

  return (
    <div className="eng-kpi-card">
      {icon && <span className="eng-kpi-icon">{icon}</span>}
      <div className="eng-kpi-body">
        <span className="eng-kpi-value" style={{ color: theme?.primaryColor ?? 'inherit' }}>{value}</span>
        <span className="eng-kpi-label">{label ?? widget.title}</span>
        {delta && (
          <span className="eng-kpi-delta" style={{ color: deltaColor }}>
            <DeltaIcon size={11} />{delta}
          </span>
        )}
      </div>
      {insight && <p className="eng-kpi-insight">{insight}</p>}
    </div>
  );
}

// ── Chart Widget ──────────────────────────────────────────────────────────────
function ChartWidget({ widget, theme }) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasAnalysis = !!widget.analysis;
  const hasInsight  = !!widget.insight;

  return (
    <div className="eng-chart-card">
      {/* Header: title + Analysis button */}
      <div className="eng-chart-header">
        <div className="eng-chart-header-left">
          <h4 className="eng-chart-title">{widget.title}</h4>
          {widget.subtitle && <span className="eng-chart-subtitle">{widget.subtitle}</span>}
        </div>
        {hasAnalysis && (
          <button
            className="eng-chart-analysis-btn"
            onClick={() => setModalOpen(true)}
            title="View deep analysis"
          >
            <BarChart2 size={12} />
            <span>Analysis</span>
          </button>
        )}
      </div>

      {/* Chart */}
      <div className="eng-chart-body">
        <ChartErrorBoundary>
          <DynamicChart
            widget={widget}
            theme={theme}
            height={widget.height ?? 220}
            dateInsights={widget.dateInsights ?? []}
          />
        </ChartErrorBoundary>
      </div>

      {/* 2-line insight below chart */}
      {hasInsight && (
        <div className="eng-chart-insight">
          <Sparkles size={11} style={{ color: theme?.primaryColor, flexShrink: 0, marginTop: 2 }} />
          <p className="eng-chart-insight-text">
            <MarkdownBold text={widget.insight} />
          </p>
        </div>
      )}

      {/* Portal modal */}
      <AnimatePresence>
        {modalOpen && (
          <AnalysisModal
            widget={widget}
            theme={theme}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Analysis Modal (portal) ────────────────────────────────────────────────────
/**
 * Matches the design from the reference screenshot:
 *
 *   ┌────────────────────────────────────────────┐
 *   │  EXECUTIVE SUMMARY                     [×] │
 *   │  Chart Title                               │
 *   │                                            │
 *   │  Insight headline in large bold color      │
 *   │                                            │
 *   │  Brief description paragraph               │
 *   │                                            │
 *   │  KEY INSIGHTS ─────────────────────────    │
 *   │                                            │
 *   │  ┌─────────────────────────────────────┐   │
 *   │  │ 1  Bold key finding title.          │   │
 *   │  │    Supporting description text…     │   │
 *   │  └─────────────────────────────────────┘   │
 *   │  ┌─────────────────────────────────────┐   │
 *   │  │ 2  …                                │   │
 *   │  └─────────────────────────────────────┘   │
 *   └────────────────────────────────────────────┘
 */
function AnalysisModal({ widget, theme, onClose }) {
  const primaryColor = theme?.primaryColor ?? '#7C3AED';

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Parse analysis into numbered insight cards
  const items = parseAnalysisItems(widget.analysis ?? '');

  // Build a headline from the insight text (first sentence, bolded key stats)
  const insightHeadline = widget.insight ?? '';

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        className="am-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Centering wrapper — flex centers the card; framer-motion only animates scale/y */}
      <div className="am-modal-wrapper" onClick={onClose}>
      {/* Modal card */}
      <motion.div
        className="am-modal"
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────── */}
        <div className="am-header">
          <div className="am-header-left">
            <span className="am-eyebrow">EXECUTIVE SUMMARY</span>
            <h2 className="am-title">{widget.title}</h2>
          </div>
          <button className="am-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────── */}
        <div className="am-body">
          {/* Large colored insight headline */}
          {insightHeadline && (
            <div className="am-insight-headline" style={{ color: primaryColor }}>
              <MarkdownBold text={insightHeadline} />
            </div>
          )}

          {/* Description — first bullet's body text as context */}
          {items[0]?.body && (
            <p className="am-description">{items[0].body}</p>
          )}

          {/* KEY INSIGHTS divider */}
          {items.length > 0 && (
            <>
              <div className="am-section-label">
                <span>KEY INSIGHTS</span>
                <div className="am-section-rule" />
              </div>

              {/* Numbered insight cards */}
              <div className="am-items">
                {items.map((item, i) => (
                  <motion.div
                    key={i}
                    className="am-item"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.28 }}
                  >
                    <div className="am-item-num" style={{ background: `${primaryColor}12`, color: primaryColor }}>
                      {i + 1}
                    </div>
                    <div className="am-item-content">
                      {item.headline && (
                        <p className="am-item-headline">
                          <strong>{item.headline}</strong>
                        </p>
                      )}
                      {item.body && (
                        <p className="am-item-body">{item.body}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
      </div>
    </>,
    document.body
  );
}

/**
 * Parse the analysis string into structured items.
 *
 * Handles two common formats from the AI:
 *
 * Format A (bullet lines):
 *   "- **Bold headline.** Body text here.\n- **Next.** More text."
 *
 * Format B (double-newline paragraphs):
 *   "**Bold headline.** Body text.\n\n**Next headline.** More text."
 *
 * Returns: [{ headline: string, body: string }, ...]
 */
function parseAnalysisItems(text) {
  if (!text) return [];

  // Split on bullet markers or double-newlines
  const rawLines = text
    .split(/\\n|\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let current = null;

  for (const line of rawLines) {
    // Lines starting with - or • are new bullet items
    if (/^[-•]/.test(line)) {
      if (current) items.push(current);
      const stripped = line.replace(/^[-•]\s*/, '');
      current = splitHeadlineBody(stripped);
    } else if (current) {
      // Continuation of previous bullet body
      current.body = current.body ? `${current.body} ${line}` : line;
    } else {
      // Free text before first bullet — treat as its own item
      items.push(splitHeadlineBody(line));
    }
  }
  if (current) items.push(current);

  // Fallback: if nothing parsed, treat whole text as one body item
  if (items.length === 0) {
    items.push({ headline: '', body: text.replace(/\*\*/g, '') });
  }

  return items;
}

/**
 * Split a string like "**Headline text.** Body text here."
 * into { headline: "Headline text.", body: "Body text here." }
 */
function splitHeadlineBody(text) {
  const match = text.match(/^\*\*(.*?)\*\*\s*(.*)$/s);
  if (match) {
    return { headline: match[1].trim(), body: match[2].trim() };
  }
  // No bold marker — whole line is body
  return { headline: '', body: text };
}

// ── Insight Card ──────────────────────────────────────────────────────────────
function InsightWidget({ widget, theme }) {
  const { content, highlights = [] } = widget;
  return (
    <div className="eng-insight" style={{ borderTopColor: theme?.primaryColor ?? '#7C3AED' }}>
      <div className="eng-insight-header">
        <span className="eng-insight-badge"
          style={{ color: theme?.primaryColor, borderColor: `${theme?.primaryColor}30` }}>
          ✦ AI Insight
        </span>
        <span className="eng-insight-title">{widget.title}</span>
      </div>
      {content && <p className="eng-insight-content"><MarkdownBold text={content} /></p>}
      {highlights.length > 0 && (
        <ul className="eng-insight-highlights">
          {highlights.map((h, i) => (
            <li key={i} className="eng-insight-highlight">
              <span className="eng-insight-dot" style={{ background: theme?.primaryColor }} />
              <MarkdownBold text={h} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Narrative Block ───────────────────────────────────────────────────────────
function NarrativeWidget({ widget, theme }) {
  const { content, highlights = [] } = widget;
  return (
    <div className="eng-narrative">
      <h3 className="eng-narrative-title" style={{ color: theme?.primaryColor }}>{widget.title}</h3>
      {content && <p className="eng-narrative-content"><MarkdownBold text={content} /></p>}
      {highlights.length > 0 && (
        <div className="eng-narrative-tags">
          {highlights.map((h, i) => (
            <span key={i} className="eng-narrative-tag"
              style={{ borderColor: `${theme?.primaryColor}40`, color: theme?.primaryColor }}>
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generic fallback ──────────────────────────────────────────────────────────
function GenericWidget({ widget }) {
  return (
    <div className="eng-generic-card">
      <h4 className="eng-chart-title">{widget.title ?? widget.id}</h4>
      <p style={{ fontSize: 12, color: 'var(--mi-text-3)' }}>Widget type: {widget.type}</p>
    </div>
  );
}

// ── MarkdownBold ──────────────────────────────────────────────────────────────
function MarkdownBold({ text }) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i}>{p}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}
