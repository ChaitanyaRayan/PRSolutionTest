import React, { createContext, useContext, useMemo } from 'react';
import { useMediaStore } from '../store/mediaStore';

/**
 * BrandThemeContext — injects the AI-generated BrandTemplate into the React tree.
 * All downstream components consume colours, fonts, layout from useBrandTheme().
 */

const DEFAULT_THEME = {
  primaryColor: '#7C3AED',
  secondaryColor: '#1e1b4b',
  accentColor: '#A78BFA',
  fontPair: { heading: 'DM Serif Display', body: 'DM Sans' },
  chartPalette: ['#7C3AED', '#EC4899', '#3DD9D6', '#F59E0B', '#A78BFA'],
  layout: 'left-aligned',
  tabs: [],
  storyboardNarrative: '',
};

const BrandThemeContext = createContext(DEFAULT_THEME);

export function BrandThemeProvider({ children }) {
  const brandTemplate = useMediaStore((s) => s.brandTemplate);

  const theme = useMemo(() => {
    if (!brandTemplate) return DEFAULT_THEME;
    return {
      ...DEFAULT_THEME,
      ...brandTemplate,
      fontPair: { ...DEFAULT_THEME.fontPair, ...(brandTemplate.fontPair || {}) },
      chartPalette: brandTemplate.chartPalette?.length
        ? brandTemplate.chartPalette
        : DEFAULT_THEME.chartPalette,
    };
  }, [brandTemplate]);

  // Inject CSS custom properties for paint-free theme switching
  const styleVars = useMemo(() => ({
    '--brand-primary': theme.primaryColor,
    '--brand-secondary': theme.secondaryColor,
    '--brand-accent': theme.accentColor,
    '--brand-font-heading': `'${theme.fontPair.heading}', serif`,
    '--brand-font-body': `'${theme.fontPair.body}', sans-serif`,
  }), [theme]);

  return (
    <BrandThemeContext.Provider value={theme}>
      <div style={styleVars}>
        {children}
      </div>
    </BrandThemeContext.Provider>
  );
}

export function useBrandTheme() {
  return useContext(BrandThemeContext);
}
