/**
 * ThemeInjector — Layer 1.
 * Injects brand-specific CSS custom properties from the AI-generated theme.
 * Every child component reads from these CSS vars — zero hardcoded colors.
 */

import React, { useMemo } from 'react';

export function ThemeInjector({ theme, children }) {
  const cssVars = useMemo(() => {
    if (!theme) return {};
    return {
      '--eng-primary':       theme.primaryColor   ?? '#7C3AED',
      '--eng-secondary':     theme.secondaryColor ?? '#1e1b4b',
      '--eng-accent':        theme.accentColor    ?? '#A78BFA',
      '--eng-bg':            theme.backgroundColor ?? '#F8F7FC',
      '--eng-surface':       theme.surfaceColor   ?? '#FFFFFF',
      '--eng-text':          theme.textColor      ?? '#111827',
      '--eng-text-muted':    theme.textMuted      ?? '#6B7280',
      '--eng-font-h':        `'${theme.fontFamily ?? 'DM Serif Display'}', serif`,
      '--eng-font-b':        `'${theme.bodyFont   ?? 'DM Sans'}', sans-serif`,
      '--eng-radius':        `${theme.cardBorderRadius ?? 12}px`,
      '--eng-shadow':        shadowValue(theme.shadowStyle),
      '--eng-palette-1':     (theme.chartPalette ?? [])[0] ?? '#7C3AED',
      '--eng-palette-2':     (theme.chartPalette ?? [])[1] ?? '#EC4899',
      '--eng-palette-3':     (theme.chartPalette ?? [])[2] ?? '#3DD9D6',
      '--eng-palette-4':     (theme.chartPalette ?? [])[3] ?? '#F59E0B',
      '--eng-palette-5':     (theme.chartPalette ?? [])[4] ?? '#A78BFA',
    };
  }, [theme]);

  return (
    <div className="eng-theme-root" style={{ ...cssVars, background: 'var(--eng-bg)', minHeight: '100%' }}>
      {children}
    </div>
  );
}

function shadowValue(style) {
  switch (style) {
    case 'hard':   return '0 4px 0 rgba(0,0,0,0.15)';
    case 'medium': return '0 4px 16px rgba(0,0,0,0.1)';
    case 'soft':
    default:       return '0 2px 12px rgba(0,0,0,0.06)';
  }
}
