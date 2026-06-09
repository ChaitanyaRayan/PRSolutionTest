/**
 * useTemplateDesign — React hook that fetches a template HTML file, extracts
 * its complete design system, and injects required Google Fonts into <head>.
 *
 * Returns:
 *   { design, cssVars, loading, error }
 *
 * `cssVars` is a React style object with --tpl-* custom properties.
 * Apply it to the root wrapper to make all tokens available via var(--tpl-*).
 */

import { useState, useEffect, useRef } from 'react';
import { HTML_TEMPLATES } from '../constants/templates';
import { extractTemplateDesign, designToCssVars } from '../utils/extractTemplateDesign';

// Module-level cache so repeated uses within the same session don't re-fetch
const designCache = new Map();

export function useTemplateDesign(template) {
  const templateId = template?.id;
  const [design,  setDesign]  = useState(() => getCachedOrFallback(templateId, template));
  const [cssVars, setCssVars] = useState(() => designToCssVars(getCachedOrFallback(templateId, template)));
  const [loading, setLoading] = useState(!designCache.has(templateId));
  const [error,   setError]   = useState(null);
  const injectedRef = useRef(new Set());

  useEffect(() => {
    if (!templateId) return;

    // Already cached — use immediately
    if (designCache.has(templateId)) {
      const d = designCache.get(templateId);
      setDesign(d);
      setCssVars(designToCssVars(d));
      setLoading(false);
      injectFonts(d.fontUrl, templateId, injectedRef);
      return;
    }

    // Find template file path
    const meta = HTML_TEMPLATES.find((t) => t.id === templateId) ?? template ?? {};
    const filePath = meta.file ?? `/templates/${templateId}.html`;

    setLoading(true);
    setError(null);

    fetch(filePath)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((html) => {
        const d = extractTemplateDesign(html, meta);
        designCache.set(templateId, d);
        setDesign(d);
        setCssVars(designToCssVars(d));
        injectFonts(d.fontUrl, templateId, injectedRef);
      })
      .catch((err) => {
        console.warn(`[useTemplateDesign] Could not parse ${templateId}:`, err.message);
        // Fall back to metadata-only design
        const fallback = extractTemplateDesign('', meta);
        designCache.set(templateId, fallback);
        setDesign(fallback);
        setCssVars(designToCssVars(fallback));
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [templateId]);

  return { design, cssVars, loading, error };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCachedOrFallback(templateId, template) {
  if (templateId && designCache.has(templateId)) return designCache.get(templateId);
  const meta = HTML_TEMPLATES.find((t) => t.id === templateId) ?? template ?? {};
  return extractTemplateDesign('', meta);
}

/**
 * Inject a Google Fonts <link> into <head> once per template.
 */
function injectFonts(fontUrl, templateId, injectedRef) {
  if (!fontUrl || injectedRef.current.has(templateId)) return;
  injectedRef.current.add(templateId);
  if (document.querySelector(`link[data-tpl="${templateId}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  link.setAttribute('data-tpl', templateId);
  document.head.appendChild(link);
}
