/**
 * TemplateShell — Wraps the entire dashboard with the selected HTML template's
 * design system applied as CSS custom properties.
 *
 * Every descendant can consume template tokens via var(--tpl-primary) etc.
 * The shell also handles:
 *  - Background (gradient / uploaded image / video URL from chat)
 *  - Font family switching per-template
 *  - Layout wrapper (sidebar vs full-width vs editorial)
 *  - Loading state while fonts + design tokens are extracted
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useTemplateDesign } from '../hooks/useTemplateDesign';
import { designToCssVars }   from '../utils/extractTemplateDesign';

// ── Context ───────────────────────────────────────────────────────────────────
const TemplateDesignContext = createContext(null);
export const useTemplateTheme = () => useContext(TemplateDesignContext) ?? {};

// ── TemplateShell ─────────────────────────────────────────────────────────────
export default function TemplateShell({
  template,             // template object from HTML_TEMPLATES
  background,           // { type: 'image'|'video'|'gradient'|null, src: string }
  children,
  className = '',
}) {
  const { design, cssVars, loading } = useTemplateDesign(template);

  // Merge custom background override into CSS vars
  const mergedStyle = useMemo(() => {
    const base = { ...cssVars };

    // Apply uploaded/chat-set background
    if (background?.src) {
      if (background.type === 'image') {
        base['--tpl-hero-bg'] = `url('${background.src}')`;
        base['--tpl-hero-overlay'] = 'rgba(0,0,0,0.45)';
      } else if (background.type === 'gradient') {
        base['--tpl-hero-bg'] = background.src;
      }
      // Video is handled separately as a <video> element
    }

    return base;
  }, [cssVars, background]);

  return (
    <TemplateDesignContext.Provider value={design}>
      <div
        className={`tpl-shell ${loading ? 'tpl-shell--loading' : ''} ${className}`}
        style={mergedStyle}
        data-template-id={template?.id}
        data-layout={design?.layout}
      >
        {children}
      </div>
    </TemplateDesignContext.Provider>
  );
}

/**
 * TemplateBackground — renders the appropriate background element (gradient/image/video).
 * Place this at the top of a section to give it the template's hero treatment.
 */
export function TemplateBackground({ type = 'gradient', src, videoRef, children, className = '' }) {
  const design = useTemplateTheme();

  if (type === 'video' && src) {
    return (
      <div className={`tpl-bg-wrap ${className}`}>
        <video
          ref={videoRef}
          className="tpl-bg-video"
          src={src}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="tpl-bg-overlay" />
        {children}
      </div>
    );
  }

  if (type === 'image' && src) {
    return (
      <div
        className={`tpl-bg-wrap ${className}`}
        style={{ backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="tpl-bg-overlay" />
        {children}
      </div>
    );
  }

  // Default: use template gradient
  const gradient = design?.accentGrad
    ?? `linear-gradient(135deg, ${design?.primary ?? '#7C3AED'}, ${design?.accent ?? '#A78BFA'})`;

  return (
    <div
      className={`tpl-bg-wrap tpl-bg-wrap--gradient ${className}`}
      style={{ background: gradient }}
    >
      {children}
    </div>
  );
}

/**
 * TemplateCard — A card component that uses the template's card style
 * (elevated/bordered/flat), radius, and shadow.
 */
export function TemplateCard({ children, className = '', span, onClick, highlight }) {
  const design = useTemplateTheme();

  const style = {
    background: `var(--tpl-surface, #fff)`,
    borderRadius: `var(--tpl-radius, 14px)`,
    boxShadow: highlight
      ? `var(--tpl-shadow-lg), 0 0 0 2px ${design?.primary ?? '#7C3AED'}40`
      : `var(--tpl-shadow-md, 0 4px 14px rgba(0,0,0,0.08))`,
    border: design?.cardStyle === 'bordered'
      ? `1px solid var(--tpl-line, rgba(0,0,0,0.08))`
      : '1px solid transparent',
    fontFamily: `var(--tpl-font-body)`,
    color: `var(--tpl-ink)`,
  };

  return (
    <div
      className={`tpl-card ${className}`}
      style={style}
      data-span={span}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * TemplateHeading — Heading using the template's display font.
 */
export function TemplateHeading({ level = 2, children, className = '', muted }) {
  const Tag   = `h${Math.min(6, Math.max(1, level))}`;
  const style = {
    fontFamily: `var(--tpl-font-heading)`,
    color: muted ? `var(--tpl-ink-muted)` : `var(--tpl-ink)`,
  };
  return <Tag className={`tpl-heading tpl-h${level} ${className}`} style={style}>{children}</Tag>;
}

/**
 * TemplateKpi — KPI metric card in template style.
 */
export function TemplateKpi({ label, value, delta, deltaPos, icon, highlight, compact }) {
  const design = useTemplateTheme();
  const deltaColor = deltaPos === false ? '#dc2626' : deltaPos === true ? '#16a34a' : design?.inkMuted;

  return (
    <div
      className={`tpl-kpi ${compact ? 'tpl-kpi--compact' : ''} ${highlight ? 'tpl-kpi--highlight' : ''}`}
      style={{
        background: `var(--tpl-surface)`,
        borderRadius: `var(--tpl-radius-sm)`,
        boxShadow: `var(--tpl-shadow-sm)`,
        borderTop: `3px solid ${design?.primary ?? '#7C3AED'}`,
        fontFamily: `var(--tpl-font-body)`,
      }}
    >
      {icon && <span className="tpl-kpi-icon">{icon}</span>}
      <div className="tpl-kpi-body">
        <span className="tpl-kpi-value"
          style={{ fontFamily: `var(--tpl-font-heading)`, color: `var(--tpl-primary)` }}>
          {value}
        </span>
        <span className="tpl-kpi-label" style={{ color: `var(--tpl-ink-muted)` }}>{label}</span>
        {delta && (
          <span className="tpl-kpi-delta" style={{ color: deltaColor }}>
            {deltaPos === true ? '↑' : deltaPos === false ? '↓' : ''} {delta}
          </span>
        )}
      </div>
    </div>
  );
}
