/**
 * extractTemplateDesign — Parses an HTML template string and returns a complete
 * design-system object that React components can consume as CSS custom properties.
 *
 * This replaces the crude "apply a few hex colors" approach with a full extraction
 * of every design token the template uses: fonts, palette, shadows, radii, layout,
 * background style, card style, hero style.
 */

/**
 * @param {string} html     — Raw HTML template string
 * @param {object} meta     — Template metadata from templates.js (id, name, primaryColor, etc.)
 * @returns {TemplateDesign}
 */
export function extractTemplateDesign(html = '', meta = {}) {
  // ── Extract CSS :root variables ─────────────────────────────────────────────
  const cssVars = {};
  const rootMatch = html.match(/:root\s*\{([^}]+)\}/s);
  if (rootMatch) {
    for (const m of rootMatch[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      cssVars[m[1]] = m[2].trim();
    }
  }

  function v(...keys) {
    for (const k of keys) if (cssVars[k]) return cssVars[k];
    return null;
  }

  // ── Colors ──────────────────────────────────────────────────────────────────
  const primary = v('primary', 'brand-primary', 'crimson', 'wine', 'brand', 'accent')
    ?? meta.primaryColor ?? '#7C3AED';
  const primaryDark = v('primary-dark', 'brand-dark', 'crimson-dark') ?? darken(primary);
  const primaryLight = v('primary-light', 'primary-soft', 'primary-tint') ?? lighten(primary);
  const accent   = v('accent', 'brand-accent', 'coral', 'salmon', 'neon-bg', 'secondary')
    ?? meta.accentColor ?? primaryLight;
  const bgColor  = v('bg', 'page-bg', 'ivory', 'background', 'bg-soft')
    ?? meta.bgColor ?? '#f8f9fa';
  const surface  = v('surface', 'card-bg', 'card', 'paper', 'paper-warm')
    ?? '#ffffff';
  const surface2 = v('surface-2', 'bg-warm', 'pearl', 'bg-soft', 'bg-2')
    ?? lighten(bgColor);
  const ink      = v('ink', 'text-dark', 'charcoal', 'text-primary', 'black', 'black-deep')
    ?? meta.textColor ?? '#111827';
  const inkSoft  = v('ink-soft', 'text-mid', 'graphite', 'text-secondary')
    ?? '#374151';
  const inkMuted = v('ink-mute', 'text-light', 'slate', 'muted', 'text-muted', 'text-3')
    ?? '#9ca3af';
  const line     = v('line', 'border', 'line-soft', 'divider')
    ?? 'rgba(0,0,0,0.08)';
  const gold     = v('gold', 'gold-deep', 'amber');

  // ── Shadows ─────────────────────────────────────────────────────────────────
  const shadowSm = v('shadow-sm', 'shadow-xs') ?? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';
  const shadowMd = v('shadow-md', 'shadow')    ?? '0 4px 14px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)';
  const shadowLg = v('shadow-lg', 'shadow-xl') ?? '0 12px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.07)';

  // ── Border radius ────────────────────────────────────────────────────────────
  const radiusSm = v('radius-sm', 'card-radius-sm') ?? '8px';
  const radius   = v('radius', 'card-radius', 'radius-md') ?? '14px';
  const radiusLg = v('radius-lg', 'radius-xl')     ?? '20px';

  // ── Fonts ───────────────────────────────────────────────────────────────────
  let headingFont = 'Inter';
  let bodyFont    = 'Inter';
  let monoFont    = 'monospace';

  // Try CSS variable declarations first
  const displayVar = v('font-display', 'font-heading', 'font-serif', 'heading-font');
  const sansVar    = v('font-sans', 'font-body', 'body-font');
  const monoVar    = v('font-mono');

  if (displayVar) { const m = displayVar.match(/'([^']+)'/); if (m) headingFont = m[1]; }
  if (sansVar)    { const m = sansVar.match(/'([^']+)'/);    if (m) bodyFont    = m[1]; }
  if (monoVar)    { const m = monoVar.match(/'([^']+)'/);    if (m) monoFont    = m[1]; }

  // Fall back to Google Fonts link extraction
  const fontFamilies = [];
  for (const m of html.matchAll(/family=([A-Za-z+%0-9,;:\|]+)/g)) {
    const families = m[1].split('%7C').flatMap(f => f.split('|'))
      .map(f => f.split(':')[0].replace(/\+/g, ' ').trim())
      .filter(Boolean);
    fontFamilies.push(...families);
  }
  if (fontFamilies[0] && headingFont === 'Inter') headingFont = fontFamilies[0];
  if (fontFamilies[1] && bodyFont === 'Inter' && fontFamilies[1] !== fontFamilies[0]) {
    bodyFont = fontFamilies[1];
  }

  // Build Google Fonts URL for these fonts
  const fontsToLoad = [...new Set([headingFont, bodyFont].filter(f => f !== 'Inter'))];
  const fontUrl = fontsToLoad.length
    ? `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f.replace(/ /g,'+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400`).join('&')}&display=swap`
    : '';

  // ── Layout detection ─────────────────────────────────────────────────────────
  const hasSidebar  = /class="sidebar|id="sidebar|<aside|\.sidebar\s*\{/i.test(html);
  const hasStorybar = /story-strip|story-step|story-chapter|storyboard/i.test(html);
  const hasTabs     = /class="page[^"]*"\s|\.page\s*\{/.test(html);

  let layout = 'editorial';
  if (hasSidebar)  layout = 'sidebar';
  else if (hasTabs) layout = 'tabbed';
  else if (hasStorybar) layout = 'storyboard';

  // ── Hero / background style ──────────────────────────────────────────────────
  const heroClasses = html.match(/\.(?:welcome-hero|story-banner|brand-hero|hero-section|cover)\s*\{([^}]+)\}/s);
  const heroText    = heroClasses?.[1] ?? '';
  const heroDark    = /background\s*:[^;]*#[01]/i.test(heroText) || /linear-gradient[^;]*#[01]/i.test(heroText);
  const heroHasVideo = /\.welcome-hero-video|cover-left-video|banner-shader-canvas/.test(html);

  // ── Card style from template ─────────────────────────────────────────────────
  const cardClasses = html.match(/\.(?:card|kpi|stat-card|insight-card|metric-card)\s*\{([^}]+)\}/s);
  const cardText    = cardClasses?.[1] ?? '';
  const cardStyle   = /border\s*:/.test(cardText) ? 'bordered'
    : /box-shadow\s*:/.test(cardText) ? 'elevated'
    : 'flat';

  // ── Chart palette from template ──────────────────────────────────────────────
  const paletteMatch = html.match(/\[(?:\s*['"]#[0-9a-fA-F]{3,6}['"],?\s*){3,}/);
  let chartPalette = meta.palette ?? [primary, accent, '#3DD9D6', '#F59E0B', '#A78BFA'];
  if (paletteMatch) {
    const colors = paletteMatch[0].match(/#[0-9a-fA-F]{3,6}/g);
    if (colors?.length >= 3) chartPalette = colors.slice(0, 6);
  }

  // ── Gradient / accent strings ────────────────────────────────────────────────
  const accentGrad = v('accent-grad', 'gradient-primary', 'hero-gradient')
    ?? `linear-gradient(135deg, ${primary}, ${accent})`;

  return {
    id:           meta.id,
    name:         meta.name ?? 'Dashboard',
    // Fonts
    headingFont,
    bodyFont,
    monoFont,
    fontUrl,
    // Colors
    primary,
    primaryDark,
    primaryLight,
    accent,
    accentGrad,
    gold,
    bgColor,
    surface,
    surface2,
    ink,
    inkSoft,
    inkMuted,
    line,
    chartPalette,
    // Shadows
    shadowSm,
    shadowMd,
    shadowLg,
    // Radii
    radiusSm,
    radius,
    radiusLg,
    // Layout
    layout,          // 'sidebar' | 'tabbed' | 'storyboard' | 'editorial'
    hasSidebar,
    hasStorybar,
    hasTabs,
    // Hero
    heroDark,
    heroHasVideo,
    cardStyle,       // 'elevated' | 'bordered' | 'flat'
    // Raw CSS vars for advanced overrides
    rawCssVars: cssVars,
  };
}

// ── CSS custom-property object for React ─────────────────────────────────────
/**
 * Converts a TemplateDesign into a React `style` prop object with CSS custom
 * properties. Apply this to the root wrapper div to make all template tokens
 * available throughout the subtree via `var(--tpl-*)`.
 */
export function designToCssVars(d) {
  if (!d) return {};
  return {
    '--tpl-primary':      d.primary,
    '--tpl-primary-dark': d.primaryDark,
    '--tpl-primary-light':d.primaryLight,
    '--tpl-accent':       d.accent,
    '--tpl-accent-grad':  d.accentGrad,
    '--tpl-gold':         d.gold ?? d.accent,
    '--tpl-bg':           d.bgColor,
    '--tpl-surface':      d.surface,
    '--tpl-surface-2':    d.surface2,
    '--tpl-ink':          d.ink,
    '--tpl-ink-soft':     d.inkSoft,
    '--tpl-ink-muted':    d.inkMuted,
    '--tpl-line':         d.line,
    '--tpl-shadow-sm':    d.shadowSm,
    '--tpl-shadow-md':    d.shadowMd,
    '--tpl-shadow-lg':    d.shadowLg,
    '--tpl-radius-sm':    d.radiusSm,
    '--tpl-radius':       d.radius,
    '--tpl-radius-lg':    d.radiusLg,
    '--tpl-font-heading': `'${d.headingFont}', Georgia, serif`,
    '--tpl-font-body':    `'${d.bodyFont}', system-ui, sans-serif`,
    '--tpl-font-mono':    `'${d.monoFont}', monospace`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function darken(hex) {
  if (!hex?.startsWith('#')) return hex;
  try {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - 30);
    const g = Math.max(0, ((n >> 8) & 0xff) - 30);
    const b = Math.max(0, (n & 0xff) - 30);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}
function lighten(hex) {
  if (!hex?.startsWith('#')) return hex;
  try {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 40);
    const g = Math.min(255, ((n >> 8) & 0xff) + 40);
    const b = Math.min(255, (n & 0xff) + 40);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}
