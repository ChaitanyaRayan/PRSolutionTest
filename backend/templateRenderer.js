/**
 * templateRenderer.js — AI-powered HTML template data injection.
 *
 * Flow:
 *  1. GET /api/template/render?template_id=template_02&workflow_id=31&lens_id=1
 *  2. Read the HTML template file from /frontend/public/templates/
 *  3. Fetch real chart data from charts?workflow_id=&lens_id= external API
 *  4. AI (Claude/GPT) studies the template's JavaScript + DOM structure and generates
 *     a custom injectRealData(data) function tailored to that template
 *  5. Inject window.__REAL_DATA__ + the injection script into the HTML
 *  6. Return the complete, data-enriched HTML to the frontend iframe
 *
 * The AI "learns" each template — it reads the template's own variable names,
 * element IDs, Chart.js instances, and data structures, then writes targeted
 * DOM update code to replace every static demo value with live API data.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── In-memory script cache: "templateId:workflowId:lensId" → { script, at } ──
const scriptCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

// ── External charts API ───────────────────────────────────────────────────────
async function fetchChartData(workflowId, lensId) {
  const base = process.env.VITE_API_BASE_URL || 'https://pr-solutions-be.devamx.com';
  try {
    const res = await fetch(`${base}/charts?workflow_id=${workflowId}&lens_id=${lensId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── AI injection script generator ────────────────────────────────────────────
async function generateInjectionScript(templateHtml, chartData, callAI) {
  // For very large templates (>2MB), only take the last <script> block + first body section
  // to avoid exceeding AI token limits
  const isLarge = templateHtml.length > 2_000_000;

  let scriptContent;
  if (isLarge) {
    // Take only the LAST script block (usually the init code) + a narrow body slice
    const scriptBlocks = [...templateHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    const lastScripts  = scriptBlocks.slice(-3).map((m) => m[0]).join('\n');
    scriptContent = lastScripts.substring(0, 5000);
  } else {
    scriptContent = (templateHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/g) ?? [])
      .join('\n')
      .substring(0, 8000);
  }

  const bodyStart   = templateHtml.indexOf('<body');
  const bodyPreview = templateHtml.substring(bodyStart, Math.min(bodyStart + 4000, templateHtml.length));

  const system = `You are a JavaScript DOM expert specializing in live data injection into HTML templates.

You will receive:
1. A template's JavaScript initialization code (what data variables it uses, element IDs, Chart.js setup)
2. The template's HTML body structure (first 6kb — shows element IDs and classes)
3. Real API data from a media intelligence platform

Your job: Write a JavaScript function \`function injectRealData(data)\` that:
- Maps fields from the API data object to the template's specific DOM element IDs
- Updates metric counters (textContent) — e.g., total_count, total_reach, sentiment percentages
- Updates Chart.js chart data where charts exist (find them via Chart.instances or window.myChart etc.)
- Updates progress bars (width %), donut charts, gauge elements using real percentages
- Updates insight/narrative text elements where relevant
- Is completely safe (always checks if element exists before updating)
- Returns nothing (void function)

API data fields to map:
- data.chart_data.total_count → total article count
- data.chart_data.total_reach → total reach number
- data.chart_data.sentiment_distribution.net_sentiment_score → net sentiment
- data.chart_data.sentiment_distribution.POS.percentage → positive %
- data.chart_data.sentiment_distribution.NEG.percentage → negative %
- data.chart_data.sentiment_distribution.NEU.percentage → neutral %
- data.chart_data.theme_distribution → array of {theme, count, sentiments}
- data.chart_data.top_publications → array of {label, count}
- data.chart_data.datewise_coverage → array of {date, count}
- data.chart_insights → per-chart AI insights with .insight and .analysis text
- data.overall_assessment → string executive summary

CRITICAL RULES:
- Always use: const el = document.getElementById('...'); if(el) el.textContent = ...;
- For numbers use: Number(value).toFixed(1) or Math.round(value)
- Return ONLY the function body — no markdown, no explanation, no extra code
- Start directly with: function injectRealData(data) {`;

  const user = `TEMPLATE JAVASCRIPT (data init + chart setup):
\`\`\`js
${scriptContent}
\`\`\`

TEMPLATE BODY STRUCTURE (element IDs and metrics):
\`\`\`html
${bodyPreview}
\`\`\`

REAL API DATA (chart_data excerpt):
\`\`\`json
${JSON.stringify(chartData?.chart_data ?? {}, null, 2).substring(0, 4000)}
\`\`\`

Write the injectRealData function now:`;

  try {
    const raw = await callAI(system, user, { maxTokens: 4096 });
    // Ensure it starts with the function keyword
    const fn = raw.includes('function injectRealData')
      ? raw.substring(raw.indexOf('function injectRealData'))
      : `function injectRealData(data) {\n${raw}\n}`;
    return fn;
  } catch (err) {
    console.warn('[templateRenderer] AI script gen failed:', err.message);
    return buildFallbackScript(chartData);
  }
}

// ── Fallback injection (no AI) — covers the most common metric patterns ───────
function buildFallbackScript(chartData) {
  const cd = chartData?.chart_data ?? {};
  return `function injectRealData(data) {
  var cd = (data && data.chart_data) || {};
  var ci = (data && data.chart_insights) || {};

  // Metric counters — try common element ID patterns
  var count = cd.total_count || 0;
  var reach = cd.total_reach || 0;
  var sd = cd.sentiment_distribution || {};
  var pos = (sd.POS && sd.POS.percentage) || 0;
  var neg = (sd.NEG && sd.NEG.percentage) || 0;
  var neu = (sd.NEU && sd.NEU.percentage) || 0;
  var net = sd.net_sentiment_score || 0;

  // Try injecting into elements with common ID patterns
  var patterns = [
    ['es-mentions','ctr-mentions','total-mentions','mentions-count','kpi-mentions'], count.toString(),
    ['ctr-pos','pos-pct','positive-pct','sentiment-pos'],                            pos.toFixed(1) + '%',
    ['ctr-neg','neg-pct','negative-pct','sentiment-neg'],                            neg.toFixed(1) + '%',
    ['ctr-neu','neu-pct','neutral-pct','sentiment-neu'],                             neu.toFixed(1) + '%',
    ['ctr-net','net-sentiment','net-score'],                                         net.toFixed(1),
    ['total-reach','reach-value','kpi-reach'],                                       (reach/1e6).toFixed(1) + 'M',
  ];

  // Walk patterns and update matching elements
  for (var i = 0; i < patterns.length; i += 2) {
    var ids = patterns[i]; var val = patterns[i+1];
    if (!Array.isArray(ids)) continue;
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.tagName !== 'INPUT') el.textContent = val;
    });
  }

  // Update overall assessment text
  if (data && data.overall_assessment) {
    var oa = document.getElementById('overall-assessment') || document.querySelector('[data-slot="overall"]');
    if (oa) oa.textContent = data.overall_assessment;
  }
}`;
}

// ── postMessage bridge injected into every template ───────────────────────────
const POST_MESSAGE_BRIDGE = `
<script id="__react_bridge__">
(function(){
  // Sync page changes back to parent React app
  var _gp = window.goPage;
  if (typeof _gp === 'function') {
    window.goPage = function(n) {
      _gp(n);
      window.parent.postMessage({ type: 'PAGE_CHANGED', page: n }, '*');
    };
  }
  // Listen for commands from React parent
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'GO_PAGE' && typeof window.goPage === 'function') {
      window.goPage(e.data.page);
    }
    if (e.data.type === 'PING') {
      // Count pages in template
      var pages = document.querySelectorAll('.page');
      window.parent.postMessage({ type: 'PONG', totalPages: pages.length || 1 }, '*');
    }
  });
  // Auto-ping on load
  window.addEventListener('load', function() {
    var pages = document.querySelectorAll('.page');
    window.parent.postMessage({ type: 'TEMPLATE_READY', totalPages: pages.length || 1 }, '*');
  });
})();
</script>`;

// ── Mount routes ──────────────────────────────────────────────────────────────
export function mountTemplateRoutes(app, callAI) {

  /**
   * GET /api/template/render
   * Returns the full template HTML with real data injected.
   */
  app.get('/api/template/render', async (req, res) => {
    const { template_id, workflow_id, lens_id, force } = req.query;
    if (!template_id) return res.status(400).json({ error: 'template_id is required' });

    try {
      // ── 1. Load template HTML ──────────────────────────────────────────────
      const templatePath = join(__dir, '../frontend/public/templates', `${template_id}.html`);
      let templateHtml;
      try {
        templateHtml = await readFile(templatePath, 'utf8');
      } catch {
        return res.status(404).json({ error: `Template ${template_id} not found` });
      }

      // ── 2. Fetch real chart data ───────────────────────────────────────────
      let chartData = null;
      if (workflow_id && lens_id) {
        chartData = await fetchChartData(workflow_id, lens_id);
      }

      // ── 3. Get or generate AI injection script ─────────────────────────────
      const cacheKey = `${template_id}:${workflow_id ?? 'x'}:${lens_id ?? 'x'}`;
      const cached   = scriptCache.get(cacheKey);
      let injectionScript;

      if (cached && !force && (Date.now() - cached.at < CACHE_TTL_MS)) {
        injectionScript = cached.script;
        console.log(`[templateRenderer] cache hit ${cacheKey}`);
      } else if (chartData) {
        console.log(`[templateRenderer] generating injection script for ${cacheKey} (template size: ${Math.round(templateHtml.length/1024)}kb)…`);
        try {
          injectionScript = await generateInjectionScript(templateHtml, chartData, callAI);
          scriptCache.set(cacheKey, { script: injectionScript, at: Date.now() });
          console.log(`[templateRenderer] script generated (${injectionScript.length} chars)`);
        } catch (aiErr) {
          console.warn(`[templateRenderer] AI script gen failed, using fallback: ${aiErr.message}`);
          injectionScript = buildFallbackScript(chartData);
        }
      } else {
        injectionScript = buildFallbackScript(null);
      }

      // ── 4. Build injection payloads ────────────────────────────────────────
      const realDataScript = chartData
        ? `<script id="__real_data__">window.__REAL_DATA__ = ${JSON.stringify(chartData)};</script>\n`
        : '';

      const dataRunnerScript = injectionScript
        ? `<script id="__data_runner__">
try {
  ${injectionScript}
  function __runInjection() {
    if (window.__REAL_DATA__) {
      injectRealData(window.__REAL_DATA__);
      console.log('[TemplateRenderer] Data injection complete');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __runInjection);
  } else {
    // Slight delay to let template's own DOMContentLoaded handlers run first
    setTimeout(__runInjection, 200);
  }
} catch(e) { console.warn('[TemplateRenderer] Injection error:', e); }
</script>\n`
        : '';

      // ── 5. Inject into HTML ────────────────────────────────────────────────
      let html = templateHtml;

      // Inject real data + runner right after <head> open tag
      html = html.replace('<head>', `<head>\n${realDataScript}`);

      // Inject data runner + postMessage bridge before </body>
      html = html.replace('</body>', `${dataRunnerScript}${POST_MESSAGE_BRIDGE}\n</body>`);

      // ── 6. Respond ────────────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(html);

    } catch (err) {
      console.error('[templateRenderer] error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * DELETE /api/template/render/cache/:template_id
   * Clears the cached injection script for a template (forces AI regeneration).
   */
  app.delete('/api/template/render/cache/:template_id', (req, res) => {
    const keys = [...scriptCache.keys()].filter((k) => k.startsWith(req.params.template_id));
    keys.forEach((k) => scriptCache.delete(k));
    res.json({ cleared: keys.length, keys });
  });
}
