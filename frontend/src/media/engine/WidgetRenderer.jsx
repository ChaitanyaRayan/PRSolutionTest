/**
 * WidgetRenderer — renders any widget type from the dashboard config.
 * The frontend is a pure renderer. Zero hardcoded data or chart logic here.
 *
 * Widget types:
 *   hero-banner  — Full-width brand hero section
 *   kpi-card     — Big stat card
 *   chart        — DynamicChart wrapper
 *   insight      — AI executive insight card
 *   narrative    — Storytelling narrative block
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ChartErrorBoundary } from '../components/ChartErrorBoundary';
import { DynamicChart } from './charts/DynamicChart';

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
    case 'hero-banner':
      return <HeroBannerWidget widget={widget} theme={theme} />;
    case 'kpi-card':
      return <KpiCardWidget widget={widget} theme={theme} />;
    case 'chart':
      return <ChartWidget widget={widget} theme={theme} />;
    case 'insight':
      return <InsightWidget widget={widget} theme={theme} />;
    case 'narrative':
      return <NarrativeWidget widget={widget} theme={theme} />;
    default:
      return <GenericWidget widget={widget} />;
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
  const { value, label, delta, deltaPos, icon } = widget;
  const DeltaIcon = deltaPos === false ? TrendingDown : deltaPos === true ? TrendingUp : Minus;
  const deltaColor = deltaPos === false ? 'var(--mi-negative)' : deltaPos === true ? 'var(--mi-positive)' : 'var(--mi-text-3)';

  return (
    <div className="eng-kpi-card">
      {icon && <span className="eng-kpi-icon">{icon}</span>}
      <div className="eng-kpi-body">
        <span className="eng-kpi-value" style={{ color: theme?.primaryColor ?? 'inherit' }}>
          {value}
        </span>
        <span className="eng-kpi-label">{label ?? widget.title}</span>
        {delta && (
          <span className="eng-kpi-delta" style={{ color: deltaColor }}>
            <DeltaIcon size={11} />{delta}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Chart Widget ──────────────────────────────────────────────────────────────
function ChartWidget({ widget, theme }) {
  return (
    <div className="eng-chart-card">
      <div className="eng-chart-header">
        <h4 className="eng-chart-title">{widget.title}</h4>
        {widget.subtitle && <span className="eng-chart-subtitle">{widget.subtitle}</span>}
      </div>
      <div className="eng-chart-body">
        <ChartErrorBoundary>
          <DynamicChart widget={widget} theme={theme} height={widget.height ?? 220} />
        </ChartErrorBoundary>
      </div>
    </div>
  );
}

// ── Insight Card ──────────────────────────────────────────────────────────────
function InsightWidget({ widget, theme }) {
  const { content, highlights = [] } = widget;
  return (
    <div className="eng-insight" style={{ borderTopColor: theme?.primaryColor ?? '#7C3AED' }}>
      <div className="eng-insight-header">
        <span className="eng-insight-badge" style={{ color: theme?.primaryColor, borderColor: `${theme?.primaryColor}30` }}>
          ✦ AI Insight
        </span>
        <span className="eng-insight-title">{widget.title}</span>
      </div>
      {content && <p className="eng-insight-content">{content}</p>}
      {highlights.length > 0 && (
        <ul className="eng-insight-highlights">
          {highlights.map((h, i) => (
            <li key={i} className="eng-insight-highlight">
              <span className="eng-insight-dot" style={{ background: theme?.primaryColor }} />
              {h}
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
      {content && <p className="eng-narrative-content">{content}</p>}
      {highlights.length > 0 && (
        <div className="eng-narrative-tags">
          {highlights.map((h, i) => (
            <span key={i} className="eng-narrative-tag" style={{ borderColor: `${theme?.primaryColor}40`, color: theme?.primaryColor }}>
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
