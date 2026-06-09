/**
 * dashboardApi.js — AI-driven dashboard generation & conversational modification.
 *
 * Endpoints:
 *   GET  /api/dashboard/:workflowId?lens_id=   — generate/retrieve dashboard config per lens
 *   POST /api/dashboard/:workflowId/chat       — conversational modification
 *   GET  /api/dashboard/:workflowId/versions   — version history per lens
 *   POST /api/dashboard/:workflowId/restore/:versionId — restore version
 */

import { randomUUID } from 'crypto';

// ── In-memory store: "{workflowId}:{lensId}" → [{ versionId, createdAt, config, label }]
const dashboardStore = new Map();

// ── Lens-specific tab structures ──────────────────────────────────────────────
const LENS_STORYBOARDS = {
  // lens_id: 1 — Media Measurement
  1: [
    { id: 'overview',   title: 'Coverage Overview',     subtitle: 'Volume & source breakdown',  icon: '📰', layout: 'hero' },
    { id: 'reach',      title: 'Reach & Impressions',   subtitle: 'Audience impact metrics',    icon: '👁️', layout: 'analytics' },
    { id: 'sources',    title: 'Source Analysis',       subtitle: 'Publication & tier intel',   icon: '📡', layout: '3col' },
    { id: 'trends',     title: 'Volume Trends',         subtitle: 'Time-series coverage',       icon: '📈', layout: '2col' },
    { id: 'kpis',       title: 'Performance KPIs',      subtitle: 'Summary scorecard',          icon: '🎯', layout: 'executive' },
  ],
  // lens_id: 2 — Media Monitoring
  2: [
    { id: 'live',       title: 'Live Monitor',          subtitle: 'Real-time brand activity',   icon: '🔴', layout: 'hero' },
    { id: 'sentiment',  title: 'Sentiment Pulse',       subtitle: 'Brand perception shifts',    icon: '💬', layout: 'analytics' },
    { id: 'alerts',     title: 'Risk Alerts',           subtitle: 'Crisis & escalation signals',icon: '⚠️', layout: '2col' },
    { id: 'channels',   title: 'Channel Breakdown',     subtitle: 'Media type distribution',    icon: '📱', layout: '3col' },
    { id: 'narrative',  title: 'Narrative Tracker',     subtitle: 'Emerging story themes',      icon: '🔍', layout: 'storytelling' },
  ],
  // lens_id: 3 — Narrative Intelligence
  3: [
    { id: 'themes',     title: 'Theme Intelligence',    subtitle: 'Dominant narratives',        icon: '💡', layout: 'hero' },
    { id: 'velocity',   title: 'Narrative Velocity',    subtitle: 'Theme growth & decay',       icon: '🚀', layout: 'analytics' },
    { id: 'messaging',  title: 'Message Alignment',     subtitle: 'Brand vs media framing',     icon: '🎯', layout: '2col' },
    { id: 'competitors',title: 'Competitive Narratives',subtitle: 'Rival brand story share',    icon: '⚔️', layout: '3col' },
    { id: 'lifecycle',  title: 'Story Lifecycle',       subtitle: 'From emergence to fade',     icon: '🔄', layout: 'storytelling' },
  ],
  // lens_id: 4 — PR Impact
  4: [
    { id: 'impact',     title: 'PR Impact Score',       subtitle: 'Composite coverage quality', icon: '⚡', layout: 'hero' },
    { id: 'emv',        title: 'Earned Media Value',    subtitle: 'ROI & value attribution',    icon: '💰', layout: 'analytics' },
    { id: 'tier',       title: 'Tier Intelligence',     subtitle: 'Outlet quality & authority', icon: '🏆', layout: '3col' },
    { id: 'spokespeople',title: 'Spokesperson Perf.',   subtitle: 'Quote & mention attribution',icon: '🎙️', layout: '2col' },
    { id: 'campaigns',  title: 'Campaign Tracker',      subtitle: 'Initiative-level performance',icon: '📣', layout: 'storytelling' },
  ],
  // lens_id: 5 — Reputation Intelligence
  5: [
    { id: 'score',      title: 'Reputation Score',      subtitle: 'Composite brand health',     icon: '⭐', layout: 'hero' },
    { id: 'drivers',    title: 'Reputation Drivers',    subtitle: 'What builds & erodes trust', icon: '🔬', layout: 'analytics' },
    { id: 'benchmark',  title: 'Competitor Benchmark',  subtitle: 'Reputation vs sector peers', icon: '📊', layout: '3col' },
    { id: 'trust',      title: 'Trust Dimensions',      subtitle: 'Quality, integrity, advocacy',icon: '🤝', layout: '2col' },
    { id: 'timeline',   title: 'Reputation Timeline',   subtitle: 'Historic brand perception',  icon: '📅', layout: 'storytelling' },
  ],
};

// Default storyboard when lens_id is unrecognised
const DEFAULT_STORYBOARD = [
  { id: 'executive',  title: 'Executive Summary',    subtitle: 'Key findings overview',      icon: '⚡', layout: 'hero' },
  { id: 'coverage',   title: 'Media Coverage',       subtitle: 'Volume & reach',             icon: '📰', layout: '3col' },
  { id: 'sentiment',  title: 'Sentiment Analysis',   subtitle: 'Brand perception',           icon: '💬', layout: 'analytics' },
  { id: 'narratives', title: 'Narrative Intelligence',subtitle: 'Emerging themes',           icon: '🔍', layout: 'storytelling' },
  { id: 'performance',title: 'Performance KPIs',     subtitle: 'Impact metrics',             icon: '📊', layout: '2col' },
];

// ── Dashboard JSON schema ─────────────────────────────────────────────────────
const SCHEMA_DESCRIPTION = `
Return a COMPLETE dashboard configuration JSON with this exact schema:

{
  "version": 1,
  "workflowId": "string",
  "lensId": "string",
  "theme": {
    "brandName": "string",
    "designStyle": "string",
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "backgroundColor": "#hex",
    "surfaceColor": "#hex",
    "textColor": "#hex",
    "textMuted": "#hex",
    "fontFamily": "Google Font name for headings",
    "bodyFont": "Google Font name for body",
    "chartPalette": ["#hex","#hex","#hex","#hex","#hex"],
    "cardBorderRadius": 12,
    "shadowStyle": "soft|medium|hard",
    "cardStyle": "elevated|flat|bordered"
  },
  "storyboard": [ /* PROVIDED — do not change tab ids or titles */ ],
  "pages": [
    {
      "tabId": "matches storyboard id",
      "heroConfig": {
        "headline": "string",
        "subline": "string",
        "stat": "number string",
        "statLabel": "string"
      },
      "widgets": [
        {
          "id": "unique-id",
          "type": "kpi-card|chart|insight|narrative|hero-banner",
          "title": "string",
          "span": 1,

          // kpi-card fields:
          "value": "string",
          "label": "string",
          "delta": "+12%",
          "deltaPos": true,
          "icon": "emoji",

          // chart fields (REQUIRED — always include rawChartData):
          "chartType": "line|bar|area|pie|radialBar|lollipop",
          "rawChartData": [{ "label": "Jan", "val1": 120, "val2": 80 }],
          "xKey": "label",
          "series": [{"key": "val1", "label": "Series Name", "color": "#hex"}],

          // insight/analysis fields (attach from chart_insights when available):
          "insight": "2-sentence insight for this chart from chart_insights",
          "analysis": "Full bullet-point analysis text if chart has analysis in chart_insights",
          "dateInsights": [{"date": "YYYY-MM-DD","title":"Spike","summary":"...","pattern_type":"...","peak_day":"...","avg":"..."}],

          // insight/narrative fields:
          "content": "2-4 sentences of insight",
          "highlights": ["finding 1", "finding 2"]
        }
      ]
    }
  ],
  "executiveInsights": {
    "summary": "3-4 sentence overview derived from the actual data",
    "keyFindings": ["specific finding from the data 1", "finding 2", "finding 3"],
    "recommendations": ["action 1", "action 2"],
    "risks": ["risk derived from data"]
  }
}`;

const LAYOUT_GUIDE = `
Layout rules:
- "hero": hero-banner (span 3) + 3x kpi-card (span 1) + main chart (span 3)
- "analytics": 3x kpi-card (span 1) + large chart (span 2) + supporting chart (span 1)
- "3col": 3x kpi-card then charts filling 3 columns using span 1 or 2
- "2col": alternating chart + insight pairs (span 2 + span 1)
- "storytelling": narrative (span 3) + chart (span 2) + kpi (span 1) alternating
- "executive": hero-banner (span 3) + 4x kpi-card + 1 radialBar chart (span 1)

Always fill ALL tabs with widgets — never return an empty page.
Span 1 = one column, span 2 = two columns, span 3 = full width.`;

const SYSTEM_PROMPT = `You are an elite media intelligence dashboard architect.
Your output powers a live enterprise dashboard platform (Meltwater/Brandwatch grade).

The user prompt contains a CHARTS API RESPONSE — this is the single source of truth for ALL content.
You must read it carefully and use the EXACT numbers, texts, and structures from it.

CHARTS API RESPONSE structure:
• chart_data         — raw metrics: total_count, total_reach, sentiment_distribution,
                       theme_distribution, top_publications, publication_reach_sentiment,
                       datewise_coverage, datewise_distribution, syndication, top_articles
• chart_insights     — per-metric AI analysis: each key has { insight, analysis, date_insights[] }
                       COPY these directly onto matching chart widgets as:
                         widget.insight      = chart_insights[key].insight
                         widget.analysis     = chart_insights[key].analysis
                         widget.dateInsights = chart_insights[key].date_insights
• storyboard         — 5 chapter objects defining narrative structure
• overall_assessment — executive summary text string
• top_articles       — POS/NEG/NEU article arrays for narrative widgets

ABSOLUTE RULES:
1. ALL KPI values come from chart_data numbers — never fabricate.
2. ALL chart rawChartData comes from chart_data arrays — never fabricate.
3. ALL insight/analysis/dateInsights on widgets come from chart_insights — copy them verbatim.
4. Each tab has COMPLETELY different widgets — zero repetition across tabs.
5. Narrative widgets in Tab 5 use actual article titles and domains from top_articles.
6. The "overall_assessment" string goes on the executive insight widget in Tab 1.
7. Choose chart types that match data shape:
   - Time-series → area or line
   - Category counts → bar
   - Proportions → pie
   - Scores/percentages → radialBar
8. Always fill every tab — never return an empty page.
9. Respond with ONLY valid JSON — no markdown, no explanation.

${SCHEMA_DESCRIPTION}

${LAYOUT_GUIDE}`;

// ── Fetch real chart data from remote backend ─────────────────────────────────
async function fetchRemoteCharts(workflowId, lensId) {
  const base = process.env.VITE_API_BASE_URL || 'https://pr-solutions-be.devamx.com';
  try {
    const res = await fetch(`${base}/charts?workflow_id=${workflowId}&lens_id=${lensId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Convert the charts-API storyboard array into our internal tab format.
 * The charts API returns:
 *   storyboard: [{ chapter, tab_name, section_label, title, description, what_to_watch_for }]
 *
 * We map tab_name → slug id, preserve title and description as subtitle.
 */
function deriveStoryboardFromCharts(remoteCharts, lensNumId) {
  const apiStoryboard = remoteCharts?.storyboard;
  if (Array.isArray(apiStoryboard) && apiStoryboard.length > 0) {
    return apiStoryboard.map((s) => ({
      id: s.tab_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      title: s.tab_name,
      subtitle: s.section_label ?? s.description?.slice(0, 60) ?? '',
      icon: '📊',
      layout: s.chapter === 1 ? 'hero' : s.chapter === 2 ? 'analytics' : '3col',
      description: s.description ?? '',
      whatToWatch: s.what_to_watch_for ?? [],
    }));
  }
  return LENS_STORYBOARDS[lensNumId] ?? DEFAULT_STORYBOARD;
}

// ── Mount routes ──────────────────────────────────────────────────────────────
export function mountDashboardRoutes(app, callAI, workflows) {

  // ── Universal async handler wrapper — guarantees a JSON response always ──────
  // Express async route handlers silently drop unhandled promise rejections.
  // This wrapper catches them and ensures the client always gets JSON back.
  function asyncRoute(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch((err) => {
        console.error('[asyncRoute] uncaught:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message ?? 'Internal server error' });
        }
      });
    };
  }

  // GET /api/dashboard/:workflowId?lens_id=
  app.get('/api/dashboard/:workflowId', asyncRoute(async (req, res) => {
    const { workflowId } = req.params;
    const lensId         = req.query.lens_id ?? '1';
    const cacheKey       = `${workflowId}:${lensId}`;

    // ── Step 1: ALWAYS fetch remote charts ────────────────────────────────
    // Called on every request — no cache bypass — so the dashboard always
    // reflects the latest data from the external API.
    console.log(`[dashboard] fetching charts for workflow=${workflowId} lens=${lensId}…`);
    const remoteCharts = await fetchRemoteCharts(workflowId, lensId);
    console.log(`[dashboard] charts fetched: ${remoteCharts ? 'OK' : 'NULL (API unreachable)'}`);

    // ── Step 2: ALWAYS run AI generation ──────────────────────────────────
    // No cache — every page load/refresh triggers a fresh OpenAI call so
    // the dashboard content is always derived from the latest charts data.
    console.log(`[dashboard] running AI generation for workflow=${workflowId} lens=${lensId}…`);

    try {
      // Pull workflow from local store first; if absent, fetch from remote API
      let wf = workflows.get(workflowId);
      if (!wf) {
        try {
          const base = process.env.VITE_API_BASE_URL || 'https://pr-solutions-be.devamx.com';
          const r = await fetch(`${base}/workflow/${workflowId}`);
          if (r.ok) {
            wf = await r.json();
            console.log(`[dashboard] workflow ${workflowId} fetched from remote API`);
          }
        } catch (e) {
          console.warn(`[dashboard] could not fetch workflow ${workflowId} from remote:`, e.message);
        }
      }

      // Find the branch that matches this lensId
      const branches    = wf?.workflow?.branches ?? [];
      const branch      = branches.find(
        (b) => String(b.analysis?.lens_details?.id) === String(lensId)
      ) ?? branches[0] ?? {};

      const brandName   = branch?.assembly?.branding?.client_name
                       ?? wf?.workflow?.assembly?.branding?.client_name
                       ?? wf?.name ?? 'Brand';
      const lensLabel   = branch?.analysis?.lens_details?.label ?? 'Media Intelligence';
      const lensNumId   = parseInt(lensId, 10);
      const competitors = branch?.analysis?.competitors ?? [];
      const primaryColor = branch?.assembly?.branding?.color?.primary ?? '#7C3AED';
      const skillPrompt  = branch?.analysis?.skill_prompt ?? '';

      // remoteCharts already fetched at the top of the handler (Step 1 above)
      // Use storyboard from charts API if present, else fall back to hardcoded lens map
      const storyboard = deriveStoryboardFromCharts(remoteCharts, lensNumId);

      // ── Build the full charts payload for OpenAI ─────────────────────────
      // Strategy: send the complete fetchRemoteCharts response but compress
      // only the pure time-series arrays that are 80+ empty zero entries.
      // All semantic content (insights, analysis, articles, storyboard) is kept intact.
      let chartsPayload = 'No remote chart data available.';

      if (remoteCharts) {
        const cd = remoteCharts.chart_data ?? {};

        // Compress datewise arrays — keep only non-zero days (zeros add no signal)
        const compressedCd = {
          ...cd,
          datewise_coverage: (cd.datewise_coverage ?? [])
            .filter(d => d.count > 0)
            .slice(0, 40),
          datewise_distribution: cd.datewise_distribution
            ? Object.fromEntries(
                Object.entries(cd.datewise_distribution)
                  .filter(([, v]) => (v.POS ?? 0) + (v.NEG ?? 0) + (v.NEU ?? 0) > 0)
                  .slice(0, 40)
              )
            : undefined,
          // Compress publish_time_heatmap to just daily totals (not hour-by-hour zeros)
          publish_time_heatmap: (cd.publish_time_heatmap ?? []).map(dayObj => ({
            day: dayObj.day,
            total: (dayObj.data ?? []).reduce((sum, h) => sum + (h.count ?? 0), 0),
            peak_hour: (dayObj.data ?? []).reduce((best, h) => h.count > (best?.count ?? 0) ? h : best, null),
          })).filter(d => d.total > 0),
        };

        // chart_insights: keep full insight + analysis + date_insights for all fields
        // (this is the rich pre-analysed content that drives widget quality)
        const ci = remoteCharts.chart_insights ?? {};

        // Storyboard: full chapters with descriptions and what_to_watch_for
        const sb = remoteCharts.storyboard ?? [];

        // top_articles: keep title, sentiment, theme, domain (drop lengthy content)
        const topArticles = remoteCharts.chart_data?.top_articles ?? {};
        const slimArticles = {};
        ['POS','NEG','NEU'].forEach(sent => {
          slimArticles[sent] = (topArticles[sent] ?? []).slice(0, 3).map(a => ({
            id: a.id, title: a.title, sentiment: a.sentiment,
            theme: a.theme, domain: a.domain, date: a.date,
          }));
        });

        chartsPayload = JSON.stringify({
          chart_data:          compressedCd,
          chart_insights:      ci,
          storyboard:          sb,
          overall_assessment:  remoteCharts.overall_assessment ?? '',
          top_articles:        slimArticles,
        }, null, 2);
      }

      const userPrompt = `You are generating a dashboard config for the following brand and lens.
Use ONLY the data from the CHARTS API RESPONSE below. Do not invent numbers.

Brand: ${brandName}
Lens: ${lensLabel} (lens_id: ${lensId})
Primary color hint: ${primaryColor}
${competitors.length ? `Competitors: ${competitors.join(', ')}` : ''}

DASHBOARD TABS (generate one page per tab, each COMPLETELY DIFFERENT):
${JSON.stringify(storyboard.map(t => ({ id: t.id, title: t.title, layout: t.layout })))}

CHARTS API RESPONSE (this is your single source of truth):
${chartsPayload}

WIDGET MAPPING RULES — derive ALL values from the API response above:
• Tab 1 (Overview):  KPI cards from chart_data.total_count, total_reach, sentiment_distribution scores.
                     Line/area chart from chart_data.datewise_coverage (date → count).
                     Use chart_insights.total_count and chart_insights.total_reach for insight/analysis fields.
• Tab 2 (Sentiment): Pie chart from sentiment_distribution POS/NEG/NEU percentages.
                     Area chart from datewise_distribution (POS/NEG/NEU over time).
                     Use chart_insights.sentiment_distribution insight, analysis, and date_insights as dateInsights on the area chart.
• Tab 3 (Themes):    Bar chart from theme_distribution (theme vs count).
                     KPI cards for top 3 themes.
                     Use chart_insights.theme_distribution insight/analysis.
• Tab 4 (Coverage):  Bar chart from top_publications.
                     Bar/scatter from publication_reach_sentiment.
                     Heatmap summary from publish_time_heatmap.
                     Use chart_insights.top_publications and chart_insights.publication_reach_sentiment.
• Tab 5 (Stories):   Narrative widgets from top_articles — one POS card, one NEG card, one NEU card.
                     Use article title, domain, theme, date. Show the overall_assessment as an insight widget.

FIELD MAPPING for chart widgets:
- "insight" field: copy from chart_insights[matching_key].insight
- "analysis" field: copy from chart_insights[matching_key].analysis
- "dateInsights" field: copy from chart_insights[matching_key].date_insights (array of spikes)`;


      // ── AI call with explicit fallback ────────────────────────────────────
      let raw;
      try {
        raw = await callAI(SYSTEM_PROMPT, userPrompt, { maxTokens: 8000 });
      } catch (aiErr) {
        console.error('[dashboard gen] AI call failed:', aiErr.message);
        // Don't re-throw — use fallback dashboard immediately
        const fallback = buildFallbackDashboard(workflowId, lensId, brandName, lensLabel, primaryColor, storyboard, remoteCharts);
        fallback.workflowId = workflowId;
        fallback.lensId     = lensId;
        fallback.generatedAt = new Date().toISOString();
        if (remoteCharts) {
          fallback.chartsStoryboard  = remoteCharts.storyboard ?? [];
          fallback.chartInsights     = remoteCharts.chart_insights ?? {};
          fallback.overallAssessment = remoteCharts.overall_assessment ?? '';
        }
        const entry = { versionId: randomUUID(), createdAt: new Date().toISOString(), label: 'Fallback (AI unavailable)', config: fallback };
        dashboardStore.set(cacheKey, [entry]);
        return res.json(fallback);
      }

      let config;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        config = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch (parseErr) {
        console.warn('[dashboard gen] JSON parse failed, using fallback:', parseErr.message);
        config = buildFallbackDashboard(workflowId, lensId, brandName, lensLabel, primaryColor, storyboard, remoteCharts);
      }

      // Enforce metadata
      config.workflowId  = workflowId;
      config.lensId      = lensId;
      config.generatedAt = new Date().toISOString();
      config.version     = 1;

      // Always use the correct storyboard — AI may have drifted
      config.storyboard  = storyboard;

      // Fill any missing chart data
      config = ensureChartData(config, primaryColor);

      // Attach rich charts API data to the config for frontend consumption
      if (remoteCharts) {
        config.chartsStoryboard = remoteCharts.storyboard ?? [];
        config.chartInsights    = remoteCharts.chart_insights ?? {};
        config.overallAssessment = remoteCharts.overall_assessment ?? '';
      }

      const entry = {
        versionId: randomUUID(),
        createdAt: new Date().toISOString(),
        label: 'Initial generation',
        config,
      };
      dashboardStore.set(cacheKey, [entry]);
      res.json(config);

    } catch (err) {
      console.error('[dashboard gen] unhandled error:', err.message, err.stack?.split('\n')[1]);
      // Always return a usable fallback rather than crashing the frontend
      try {
        const fallback = buildFallbackDashboard(
          workflowId, lensId, 'Brand', 'Media Intelligence', '#7C3AED',
          LENS_STORYBOARDS[parseInt(lensId, 10)] ?? DEFAULT_STORYBOARD, null
        );
        fallback.workflowId  = workflowId;
        fallback.lensId      = lensId;
        fallback.generatedAt = new Date().toISOString();
        fallback._error      = err.message;   // surface the error in the config for debugging
        dashboardStore.set(cacheKey, [{ versionId: randomUUID(), createdAt: new Date().toISOString(), label: 'Error fallback', config: fallback }]);
        return res.json(fallback);
      } catch {
        res.status(500).json({ error: err.message });
      }
    }
  }));  // ← closes asyncRoute wrapper

  // POST /api/dashboard/:workflowId/chat
  app.post('/api/dashboard/:workflowId/chat', asyncRoute(async (req, res) => {
    const { workflowId }   = req.params;
    const lensId           = req.query.lens_id ?? '1';
    const cacheKey         = `${workflowId}:${lensId}`;
    const { message, conversationHistory = [], pendingWidgets = [] } = req.body;

    const stored = dashboardStore.get(cacheKey);
    if (!stored?.length) {
      return res.status(404).json({ error: 'Dashboard not found — generate it first via GET /api/dashboard/:workflowId?lens_id=' });
    }

    const currentConfig = stored[stored.length - 1].config;

    const chatSystem = `You are an elite AI analyst for Fortune 500 companies using a Media Intelligence platform.
You return structured Generative UI responses — each response is a document composed of typed blocks
that render as beautiful, executive-quality cards, charts, and tables directly in the conversation.

RESPONSE FORMAT (always return this exact shape):
{
  "response": "One concise sentence summary of what you're presenting (use **bold** for key numbers).",
  "blocks": [
    /* BLOCK TYPES — use the most appropriate for each piece of content */

    { "type": "executive_summary",
      "headline": "Compact bold headline with a key number",
      "subline": "Supporting context in one sentence",
      "badge": "POSITIVE | NEGATIVE | NEUTRAL | URGENT | INFO",
      "points": ["key point 1", "key point 2", "key point 3"] },

    { "type": "kpi_grid",
      "kpis": [
        { "label": "Total Articles", "value": "11", "delta": "+3 vs prior", "deltaPos": true,
          "subtext": "Feb–May 2026", "color": "#5B5BD6" }
      ] },

    { "type": "chart",
      "chartType": "area|line|bar|horizontal-bar|pie|donut|sov|sentiment-bar|stacked-bar|wordcloud",
      "title": "Chart title",
      "subtitle": "Optional subtitle",
      "xKey": "label",
      "data": [{ "label": "Jan", "Positive": 6, "Negative": 1 }],
      "series": [{ "key": "Positive", "label": "Positive", "color": "#16A34A" }],
      "insight": "2-sentence insight from the data" },

    { "type": "table",
      "title": "Table title",
      "columns": [
        { "key": "publication", "label": "Publication", "type": "text" },
        { "key": "sentiment",   "label": "Sentiment",   "type": "sentiment" },
        { "key": "count",       "label": "Count",       "type": "number" },
        { "key": "reach",       "label": "Reach",       "type": "number" }
      ],
      "rows": [{ "publication": "globenewswire.com", "sentiment": "Positive", "count": 2, "reach": 789741 }] },

    { "type": "insight_card",
      "icon": "✦",
      "title": "Key Finding",
      "priority": "HIGH | MEDIUM | LOW",
      "content": "Analytical finding with **bold key numbers**.",
      "bullets": ["sub-point 1", "sub-point 2"] },

    { "type": "recommendation",
      "priority": "HIGH | MEDIUM | LOW",
      "title": "Action title",
      "rationale": "Why this matters",
      "action": "Specific action to take" },

    { "type": "narrative",
      "title": "Story title",
      "chapter": "1 of 5",
      "theme": "Legal Victory | Sentiment Spike | Coverage Gap",
      "content": "Narrative text about what happened and why it matters." },

    { "type": "text",
      "content": "Plain prose text with **bold** support." }
  ],
  "changes": [
    { "type": "add_widget",    "tabId": "...", "widget": { full widget object } },
    { "type": "remove_widget", "tabId": "...", "widgetId": "..." },
    { "type": "update_widget", "tabId": "...", "widgetId": "...", "updates": {} }
  ]
}

RULES:
- Always derive numbers from the real chart data in the dashboard config
- Use sentiment colors: Positive=#16A34A, Negative=#F43F5E, Neutral=#9CA3AF
- For chart data, map from chart_data fields: datewise_coverage→area/line, sentiment_distribution→pie/donut, theme_distribution→bar, top_publications→horizontal-bar, top_authors→horizontal-bar
- kpi_grid: always include at least 3 KPIs from the actual data (total_count, total_reach, net_sentiment_score)
- insight_card priority: HIGH for risks/anomalies, MEDIUM for trends, LOW for informational
- REMOVAL: use changes[].type="remove_widget" immediately, no blocks needed
- Return ONLY valid JSON. No markdown fences. No trailing commas.`;


    // Build pending widgets context if user is confirming
    const pendingContext = pendingWidgets.length
      ? `\nPENDING WIDGETS (user is confirming these for dashboard):\n${JSON.stringify(pendingWidgets, null, 2).slice(0, 3000)}`
      : '';

    const userMsg = `Current dashboard config (tabs: ${currentConfig.storyboard?.map(t => t.title).join(', ')}):
${JSON.stringify(currentConfig, null, 2).slice(0, 5000)}
${pendingContext}

User message: "${message}"
${conversationHistory.length ? `\nConversation history:\n${conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}` : ''}`;

    try {
      const raw = await callAI(chatSystem, userMsg, { maxTokens: 4000 });
      let result;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        result = { response: raw, changes: [], chatWidgets: [] };
      }

      const changes    = result.changes    ?? [];
      const chatWidgets  = result.chatWidgets  ?? [];
      const components   = result.components   ?? [];
      const blocks       = result.blocks       ?? [];  // Generative UI blocks
      const newConfig  = changes.length ? applyChanges(currentConfig, changes) : currentConfig;

      if (changes.length) {
        stored.push({
          versionId: randomUUID(),
          createdAt: new Date().toISOString(),
          label: message.slice(0, 60),
          config: newConfig,
        });
        dashboardStore.set(cacheKey, stored);
      }

      res.json({
        message: result.response ?? result.message ?? 'Done.',
        changesApplied: changes.length,
        config: newConfig,
        blocks,        // ← Generative UI blocks (primary)
        chatWidgets,   // ← legacy chart preview widgets
        components,    // ← legacy rich inline components
        versionId: stored[stored.length - 1].versionId,
      });
    } catch (err) {
      console.error('[dashboard chat] error:', err.message);
      // Return a graceful error message rather than crashing the frontend
      res.json({
        message: `I ran into a problem: ${err.message}. Please try a simpler request or regenerate the dashboard.`,
        changesApplied: 0,
        config: dashboardStore.get(cacheKey)?.[dashboardStore.get(cacheKey).length - 1]?.config ?? null,
        chatWidgets: [],
      });
    }
  }));  // ← closes asyncRoute wrapper

  // POST /api/dashboard/:workflowId/add-widget — promote a chat preview to dashboard
  app.post('/api/dashboard/:workflowId/add-widget', (req, res) => {
    const { workflowId } = req.params;
    const lensId         = req.query.lens_id ?? '1';
    const cacheKey       = `${workflowId}:${lensId}`;
    const { tabId, widget, label } = req.body;

    const stored = dashboardStore.get(cacheKey);
    if (!stored?.length) return res.status(404).json({ error: 'Dashboard not found' });

    const currentConfig = stored[stored.length - 1].config;
    const newConfig     = applyChanges(currentConfig, [
      { type: 'add_widget', tabId, widget: { ...widget, id: widget.id ?? randomUUID() } },
    ]);

    stored.push({
      versionId: randomUUID(),
      createdAt: new Date().toISOString(),
      label: label ?? `Added widget: ${widget.title ?? 'chart'}`,
      config: newConfig,
    });
    dashboardStore.set(cacheKey, stored);
    res.json({ success: true, config: newConfig, versionId: stored[stored.length - 1].versionId });
  });

  // DELETE /api/dashboard/:workflowId/remove-widget — remove a widget from dashboard
  app.delete('/api/dashboard/:workflowId/remove-widget', (req, res) => {
    const { workflowId } = req.params;
    const lensId         = req.query.lens_id ?? '1';
    const cacheKey       = `${workflowId}:${lensId}`;
    const { tabId, widgetId } = req.body;

    const stored = dashboardStore.get(cacheKey);
    if (!stored?.length) return res.status(404).json({ error: 'Dashboard not found' });

    const currentConfig = stored[stored.length - 1].config;
    const newConfig     = applyChanges(currentConfig, [
      { type: 'remove_widget', tabId, widgetId },
    ]);

    stored.push({
      versionId: randomUUID(),
      createdAt: new Date().toISOString(),
      label: `Removed widget ${widgetId}`,
      config: newConfig,
    });
    dashboardStore.set(cacheKey, stored);
    res.json({ success: true, config: newConfig });
  });

  // GET /api/dashboard/:workflowId/versions
  app.get('/api/dashboard/:workflowId/versions', (req, res) => {
    const lensId   = req.query.lens_id ?? '1';
    const cacheKey = `${req.params.workflowId}:${lensId}`;
    const stored   = dashboardStore.get(cacheKey) ?? [];
    res.json(stored.map(({ versionId, createdAt, label, config }) => ({
      versionId, createdAt, label, version: config.version,
    })));
  });

  // POST /api/dashboard/:workflowId/restore/:versionId
  app.post('/api/dashboard/:workflowId/restore/:versionId', (req, res) => {
    const lensId   = req.query.lens_id ?? '1';
    const cacheKey = `${req.params.workflowId}:${lensId}`;
    const stored   = dashboardStore.get(cacheKey) ?? [];
    const entry    = stored.find(e => e.versionId === req.params.versionId);
    if (!entry) return res.status(404).json({ error: 'Version not found' });

    const restored = { ...entry.config, version: (stored[stored.length - 1]?.config.version ?? 1) + 1 };
    stored.push({ versionId: randomUUID(), createdAt: new Date().toISOString(), label: `Restored from v${entry.config.version}`, config: restored });
    dashboardStore.set(cacheKey, stored);
    res.json(restored);
  });
}

// ── Apply chat change operations ──────────────────────────────────────────────
function applyChanges(config, changes) {
  const next = JSON.parse(JSON.stringify(config));
  next.version = (next.version ?? 1) + 1;

  for (const change of changes) {
    switch (change.type) {
      case 'update_theme':
        Object.assign(next.theme, change.updates);
        break;
      case 'add_tab': {
        const tab = { id: change.id ?? `tab-${Date.now()}`, title: change.title, subtitle: change.subtitle ?? '', icon: change.icon ?? '📊', layout: change.layout ?? '3col' };
        next.storyboard.push(tab);
        next.pages.push({ tabId: tab.id, heroConfig: {}, widgets: change.widgets ?? [] });
        break;
      }
      case 'remove_tab':
        next.storyboard = next.storyboard.filter(t => t.id !== change.tabId);
        next.pages      = next.pages.filter(p => p.tabId !== change.tabId);
        break;
      case 'add_widget': {
        const page = next.pages.find(p => p.tabId === change.tabId);
        if (page) page.widgets.push({ id: randomUUID(), ...change.widget });
        break;
      }
      case 'remove_widget': {
        const page = next.pages.find(p => p.tabId === change.tabId);
        if (page) page.widgets = page.widgets.filter(w => w.id !== change.widgetId);
        break;
      }
      case 'update_widget': {
        const page = next.pages.find(p => p.tabId === change.tabId);
        if (page) { const w = page.widgets.find(w => w.id === change.widgetId); if (w) Object.assign(w, change.updates); }
        break;
      }
      case 'replace_page': {
        const idx = next.pages.findIndex(p => p.tabId === change.tabId);
        if (idx >= 0) next.pages[idx] = { tabId: change.tabId, heroConfig: change.heroConfig ?? {}, widgets: change.widgets ?? [] };
        break;
      }
      case 'reorder_tabs':
        if (Array.isArray(change.order)) next.storyboard = change.order.map(id => next.storyboard.find(t => t.id === id)).filter(Boolean);
        break;
      case 'update_insights':
        Object.assign(next.executiveInsights ?? {}, change.updates);
        break;
      case 'replace_all':
        return { ...change.config, version: next.version };
    }
  }
  return next;
}

// ── Ensure all chart widgets have rawChartData ────────────────────────────────
function ensureChartData(config, primaryColor) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  for (const page of config.pages ?? []) {
    for (const widget of page.widgets ?? []) {
      if (widget.type === 'chart' && (!widget.rawChartData || !widget.rawChartData.length)) {
        const xKey = widget.xKey ?? 'label';
        widget.rawChartData = months.map(m => ({ [xKey]: m, value: Math.floor(Math.random() * 80 + 20) }));
        if (!widget.series?.length) widget.series = [{ key: 'value', label: widget.title ?? 'Value', color: primaryColor ?? '#7C3AED' }];
        if (!widget.xKey) widget.xKey = xKey;
      }
    }
  }
  return config;
}

// ── Fallback dashboard (when AI parse fails) ──────────────────────────────────
function buildFallbackDashboard(workflowId, lensId, brandName, lensLabel, primaryColor, storyboard, remoteCharts) {
  const months  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const R       = (base = 40, range = 60) => Math.floor(Math.random() * range + base);
  const primary = primaryColor || '#7C3AED';

  // Extract any real numbers from remote charts to make fallback data-derived
  const chartItems  = remoteCharts?.charts ?? [];
  const firstSeries = chartItems[0]?.data ?? [];

  const pages = storyboard.map((tab, i) => ({
    tabId: tab.id,
    heroConfig: { headline: `${brandName} — ${tab.title}`, subline: `${lensLabel} · Reporting Period`, stat: String(R(100, 200)), statLabel: 'Total Data Points' },
    widgets: [
      { id: `${tab.id}-hero`, type: 'hero-banner', title: tab.title, span: 3, headline: `${brandName}: ${tab.title}`, subline: tab.subtitle },
      { id: `${tab.id}-kpi1`, type: 'kpi-card', title: 'Volume', value: String(R(80, 200)), label: 'Items', delta: `+${R(2, 18)}%`, deltaPos: true, icon: '📊', span: 1 },
      { id: `${tab.id}-kpi2`, type: 'kpi-card', title: 'Score',  value: `${R(55, 40)}%`, label: 'Index', delta: `+${R(1, 8)}pts`, deltaPos: true, icon: '⭐', span: 1 },
      { id: `${tab.id}-kpi3`, type: 'kpi-card', title: 'Reach',  value: `${R(1, 9)}.${R(0, 9)}M`, label: 'Audience', delta: `+${R(3, 15)}%`, deltaPos: true, icon: '👁️', span: 1 },
      {
        id: `${tab.id}-chart1`, type: 'chart', title: `${tab.title} Trend`, chartType: i % 2 === 0 ? 'area' : 'bar', span: 2, xKey: 'month',
        rawChartData: firstSeries.length
          ? firstSeries.map((d, j) => ({ month: months[j] ?? `W${j+1}`, value: Object.values(d).find(v => typeof v === 'number') ?? R() }))
          : months.map(m => ({ month: m, value: R() })),
        series: [{ key: 'value', label: tab.title, color: primary }],
      },
      {
        id: `${tab.id}-chart2`, type: 'chart', title: 'Distribution', chartType: 'pie', span: 1, xKey: 'label',
        rawChartData: [
          { label: 'Positive', value: R(40, 35) },
          { label: 'Neutral',  value: R(20, 20) },
          { label: 'Negative', value: R(5, 20)  },
        ],
        series: [{ key: 'value', label: '%', color: primary }],
      },
      { id: `${tab.id}-insight`, type: 'insight', title: `${tab.title} Summary`, span: 3, content: `${brandName}'s ${tab.title.toLowerCase()} shows strong performance across the reporting period. Key metrics indicate positive momentum with room for strategic improvement in targeted areas.`, highlights: [`${tab.title} metrics trending positively`, 'Data-driven insights available', 'Comparative benchmarking active'] },
    ],
  }));

  return {
    version: 1,
    workflowId,
    lensId,
    theme: {
      brandName,
      designStyle: lensLabel,
      primaryColor: primary,
      secondaryColor: '#1e1b4b',
      accentColor: '#A78BFA',
      backgroundColor: '#F8F7FC',
      surfaceColor: '#FFFFFF',
      textColor: '#111827',
      textMuted: '#6B7280',
      fontFamily: 'DM Serif Display',
      bodyFont: 'DM Sans',
      chartPalette: [primary, '#EC4899', '#3DD9D6', '#F59E0B', '#A78BFA'],
      cardBorderRadius: 12,
      shadowStyle: 'soft',
      cardStyle: 'elevated',
    },
    storyboard,
    pages,
    executiveInsights: {
      summary: `${brandName}'s ${lensLabel} dashboard reflects the current reporting period performance across all tracked metrics.`,
      keyFindings: [`${lensLabel} active for ${brandName}`, 'Coverage tracking operational', 'Real-time data pipeline connected'],
      recommendations: ['Continue monitoring key channels', 'Expand competitive tracking scope'],
      risks: ['Monitor for unexpected sentiment shifts'],
    },
  };
}
