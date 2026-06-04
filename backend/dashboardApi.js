/**
 * dashboardApi.js — AI-driven dashboard generation & conversational modification.
 *
 * Endpoints:
 *   GET  /api/dashboard/:workflowId          — generate/retrieve dashboard config
 *   POST /api/dashboard/:workflowId/chat     — conversational modification
 *   GET  /api/dashboard/:workflowId/versions — version history
 *   POST /api/dashboard/:workflowId/restore/:versionId — restore version
 */

import { randomUUID } from 'crypto';

// ── In-memory version store: workflowId → [{ versionId, createdAt, config, label }]
const dashboardStore = new Map();

// ── Dashboard JSON schema description (injected into all AI prompts) ──────────
const SCHEMA_DESCRIPTION = `
Return a COMPLETE dashboard configuration JSON with this exact schema:

{
  "version": 1,
  "workflowId": "string",
  "theme": {
    "brandName": "string",
    "designStyle": "string (e.g. 'Luxury Editorial', 'Tech Modern', 'Healthcare Authority')",
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
  "storyboard": [
    {
      "id": "tab-slug",
      "title": "Tab Title",
      "subtitle": "One-line description",
      "icon": "single emoji",
      "layout": "hero|2col|3col|analytics|storytelling|executive"
    }
  ],
  "pages": [
    {
      "tabId": "tab-slug",
      "heroConfig": {
        "headline": "Brand Executive Summary",
        "subline": "Reporting period and context",
        "stat": "247",
        "statLabel": "Total Articles"
      },
      "widgets": [
        {
          "id": "unique-widget-id",
          "type": "kpi-card|chart|insight|narrative|hero-banner",
          "title": "Widget title",
          "span": 1,

          // For kpi-card:
          "value": "string",
          "label": "string",
          "delta": "+12%",
          "deltaPos": true,
          "icon": "emoji",

          // For chart (REQUIRED — never empty):
          "chartType": "line|bar|area|pie|radialBar|lollipop",
          "rawChartData": [{ "label": "Jan", "value1": 120, "value2": 80 }],
          "xKey": "label",
          "series": [{"key": "value1", "label": "Series Name", "color": "#hex"}],

          // For insight/narrative:
          "content": "2-4 sentences of executive narrative",
          "highlights": ["key finding 1", "key finding 2"]
        }
      ]
    }
  ],
  "executiveInsights": {
    "summary": "3-4 sentence executive overview",
    "keyFindings": ["finding 1", "finding 2", "finding 3"],
    "recommendations": ["action 1", "action 2"],
    "risks": ["risk 1"]
  }
}`;

const LAYOUT_GUIDE = `
Layout types:
- "hero": Full-width hero with headline + KPI row + 1 main chart (spans 2-3 cols)
- "2col": Two equal columns of widgets
- "3col": Three columns (span 1 each, or span 2 for featured)
- "analytics": Left KPI column + right chart area (3col with left col having span-1 KPIs)
- "storytelling": Alternating narrative + chart sections, span 3 for narratives
- "executive": Large stats + minimal charts, brand-forward presentation

Span values: 1 (one column), 2 (two columns), 3 (full width)
For hero layout: first widget should be type "hero-banner" with span 3, then KPIs (span 1 each), then main chart (span 2-3)
For storytelling: use "narrative" type with span 3 between chart sections
`;

// ── AI system prompt for dashboard generation ────────────────────────────────
const DASHBOARD_GEN_SYSTEM = `You are an elite media intelligence dashboard architect for an enterprise-grade platform (comparable to Meltwater, Brandwatch, Pulsar).

You design UNIQUE, brand-specific dashboard experiences. Each brand must receive a completely different visual identity, storyboard structure, and layout composition.

CRITICAL RULES:
1. Generate rawChartData for EVERY chart widget. Data must be realistic and derived from the input context.
2. Each brand gets a UNIQUE color system — never reuse designs across brands.
3. Design the storyboard based on available data and the dashboard type selected.
4. Choose chart types that best represent the data (sentiment → area/line, share-of-voice → pie/bar, trends → line, distributions → bar).
5. Include 4-6 tabs in the storyboard with varied layouts.
6. Executive insights must be specific and data-derived.
7. Typography must feel premium — choose distinctive Google Fonts that match brand personality.
8. For luxury brands: warm tones, serif fonts, refined layouts.
9. For tech brands: crisp dark/light contrast, mono fonts for data, modern sans.
10. For healthcare/nonprofit: authoritative but approachable, trust-building blues/greens.

${SCHEMA_DESCRIPTION}

${LAYOUT_GUIDE}

Respond with ONLY valid JSON — no markdown fences, no explanation.`;

// ── Apply dashboard changes from chat ─────────────────────────────────────────
function applyChanges(config, changes) {
  const next = JSON.parse(JSON.stringify(config)); // deep clone
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
        next.storyboard = next.storyboard.filter((t) => t.id !== change.tabId);
        next.pages = next.pages.filter((p) => p.tabId !== change.tabId);
        break;

      case 'add_widget': {
        const page = next.pages.find((p) => p.tabId === change.tabId);
        if (page) page.widgets.push({ id: randomUUID(), ...change.widget });
        break;
      }

      case 'remove_widget': {
        const page = next.pages.find((p) => p.tabId === change.tabId);
        if (page) page.widgets = page.widgets.filter((w) => w.id !== change.widgetId);
        break;
      }

      case 'update_widget': {
        const page = next.pages.find((p) => p.tabId === change.tabId);
        if (page) {
          const widget = page.widgets.find((w) => w.id === change.widgetId);
          if (widget) Object.assign(widget, change.updates);
        }
        break;
      }

      case 'replace_page': {
        const idx = next.pages.findIndex((p) => p.tabId === change.tabId);
        if (idx >= 0) next.pages[idx] = { tabId: change.tabId, heroConfig: change.heroConfig ?? {}, widgets: change.widgets ?? [] };
        break;
      }

      case 'reorder_tabs':
        if (Array.isArray(change.order)) {
          next.storyboard = change.order.map((id) => next.storyboard.find((t) => t.id === id)).filter(Boolean);
        }
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

// ── Mount routes on an Express app instance ──────────────────────────────────
export function mountDashboardRoutes(app, callAI, workflows) {

  // ── GET /api/dashboard/:workflowId — generate or retrieve ─────────────────
  app.get('/api/dashboard/:workflowId', async (req, res) => {
    const { workflowId } = req.params;
    const { regenerate } = req.query;

    // Return cached if available and not forcing regeneration
    const stored = dashboardStore.get(workflowId);
    if (stored?.length && !regenerate) {
      return res.json(stored[stored.length - 1].config);
    }

    try {
      // Get workflow context
      const wf = workflows.get(workflowId);
      const brandName     = wf?.workflow?.assembly?.branding?.client_name ?? wf?.name ?? 'Brand';
      const dashboardType = wf?.workflow?.branches?.[0]?.analysis?.lens_details?.label ?? 'Media Intelligence';
      const primaryColor  = wf?.workflow?.assembly?.branding?.color?.primary ?? '#7C3AED';
      const competitors   = wf?.workflow?.branches?.[0]?.analysis?.competitors ?? [];

      const userPrompt = `Brand: ${brandName}
Dashboard type: ${dashboardType}
Brand primary color hint: ${primaryColor}
Competitors tracked: ${competitors.join(', ') || 'none specified'}
Workflow name: ${wf?.name ?? 'Media Intelligence Dashboard'}

Generate a complete, brand-unique dashboard configuration for this brand.
Make the design feel authentically tailored to ${brandName}'s identity and industry.
Include 4-5 storyboard tabs covering: Executive Summary, Media Coverage, Sentiment Analysis, Narrative Intelligence, and a brand-specific 5th tab.
Generate realistic rawChartData for all chart widgets based on a typical ${dashboardType} report context.`;

      const raw = await callAI(DASHBOARD_GEN_SYSTEM, userPrompt, { maxTokens: 8000 });

      let config;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        config = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        config.workflowId = workflowId;
        config.generatedAt = new Date().toISOString();
        config.version = 1;
      } catch {
        config = buildFallbackDashboard(workflowId, brandName, dashboardType, primaryColor);
      }

      // Validate and fill missing rawChartData
      config = ensureChartData(config, brandName);

      // Store with versioning
      const entry = { versionId: randomUUID(), createdAt: new Date().toISOString(), label: 'Initial generation', config };
      dashboardStore.set(workflowId, [entry]);

      res.json(config);
    } catch (err) {
      console.error('[dashboard gen] error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/dashboard/:workflowId/chat — conversational modification ─────
  app.post('/api/dashboard/:workflowId/chat', async (req, res) => {
    const { workflowId } = req.params;
    const { message, conversationHistory = [] } = req.body;

    const stored = dashboardStore.get(workflowId);
    if (!stored?.length) {
      return res.status(404).json({ error: 'Dashboard not found — generate it first' });
    }

    const currentConfig = stored[stored.length - 1].config;

    const chatSystem = `You are an AI dashboard modification agent for a Media Intelligence platform.
You receive the current dashboard configuration and a user request. You return structured changes to apply.

The user's goal is to update the dashboard through natural language.
You must return a JSON object with:
{
  "response": "Natural language description of what you're doing",
  "changes": [
    // Array of change operations — see types below
  ]
}

Change operation types:
- { "type": "update_theme", "updates": { "primaryColor": "#hex", ... } }
- { "type": "add_tab", "id": "slug", "title": "...", "layout": "...", "widgets": [...] }
- { "type": "remove_tab", "tabId": "slug" }
- { "type": "add_widget", "tabId": "...", "widget": { complete widget config with rawChartData } }
- { "type": "remove_widget", "tabId": "...", "widgetId": "..." }
- { "type": "update_widget", "tabId": "...", "widgetId": "...", "updates": {...} }
- { "type": "replace_page", "tabId": "...", "widgets": [...] }
- { "type": "reorder_tabs", "order": ["tab-id-1", "tab-id-2", ...] }
- { "type": "update_insights", "updates": { "summary": "...", "keyFindings": [...] } }
- { "type": "replace_all", "config": { complete new dashboard config } }

RULES:
- Always include rawChartData for any new chart widgets you create
- When changing theme, update chartPalette to match
- When adding a dark theme, update backgroundColor, surfaceColor, textColor appropriately
- Return ONLY valid JSON`;

    const userMsg = `Current dashboard config:
${JSON.stringify(currentConfig, null, 2).slice(0, 6000)}

User request: "${message}"

${conversationHistory.length ? `Previous conversation context: ${conversationHistory.slice(-3).map((m) => `${m.role}: ${m.content}`).join('\n')}` : ''}

Return the JSON with "response" and "changes" arrays.`;

    try {
      const raw = await callAI(chatSystem, userMsg, { maxTokens: 4000 });

      let result;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        result = { response: raw, changes: [] };
      }

      const changes = result.changes ?? [];
      const newConfig = changes.length > 0 ? applyChanges(currentConfig, changes) : currentConfig;

      // Store new version if changes were made
      if (changes.length > 0) {
        const entry = {
          versionId: randomUUID(),
          createdAt: new Date().toISOString(),
          label: message.slice(0, 60),
          config: newConfig,
        };
        stored.push(entry);
        dashboardStore.set(workflowId, stored);
      }

      res.json({
        message: result.response ?? 'Dashboard updated.',
        changesApplied: changes.length,
        config: newConfig,
        versionId: stored[stored.length - 1].versionId,
      });
    } catch (err) {
      console.error('[dashboard chat] error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/dashboard/:workflowId/versions ───────────────────────────────
  app.get('/api/dashboard/:workflowId/versions', (req, res) => {
    const stored = dashboardStore.get(req.params.workflowId) ?? [];
    res.json(
      stored.map(({ versionId, createdAt, label, config }) => ({
        versionId,
        createdAt,
        label,
        version: config.version,
      }))
    );
  });

  // ── POST /api/dashboard/:workflowId/restore/:versionId ────────────────────
  app.post('/api/dashboard/:workflowId/restore/:versionId', (req, res) => {
    const stored = dashboardStore.get(req.params.workflowId) ?? [];
    const entry = stored.find((e) => e.versionId === req.params.versionId);
    if (!entry) return res.status(404).json({ error: 'Version not found' });

    const restored = {
      ...entry.config,
      version: (stored[stored.length - 1]?.config.version ?? 1) + 1,
    };
    const newEntry = {
      versionId: randomUUID(),
      createdAt: new Date().toISOString(),
      label: `Restored from v${entry.config.version}`,
      config: restored,
    };
    stored.push(newEntry);
    dashboardStore.set(req.params.workflowId, stored);
    res.json(restored);
  });
}

// ── Fallback dashboard builder ────────────────────────────────────────────────
function buildFallbackDashboard(workflowId, brandName, dashboardType, primaryColor) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const R = () => Math.floor(Math.random() * 80 + 20);

  return {
    version: 1,
    workflowId,
    generatedAt: new Date().toISOString(),
    theme: {
      brandName,
      designStyle: 'Media Intelligence',
      primaryColor: primaryColor || '#7C3AED',
      secondaryColor: '#1e1b4b',
      accentColor: '#A78BFA',
      backgroundColor: '#F8F7FC',
      surfaceColor: '#FFFFFF',
      textColor: '#111827',
      textMuted: '#6B7280',
      fontFamily: 'DM Serif Display',
      bodyFont: 'DM Sans',
      chartPalette: [primaryColor || '#7C3AED', '#EC4899', '#3DD9D6', '#F59E0B', '#A78BFA'],
      cardBorderRadius: 12,
      shadowStyle: 'soft',
      cardStyle: 'elevated',
    },
    storyboard: [
      { id: 'executive', title: 'Executive Summary', subtitle: 'Key findings', icon: '⚡', layout: 'hero' },
      { id: 'coverage', title: 'Media Coverage', subtitle: 'Volume & reach', icon: '📰', layout: '3col' },
      { id: 'sentiment', title: 'Sentiment Analysis', subtitle: 'Brand perception', icon: '💬', layout: 'analytics' },
      { id: 'narratives', title: 'Narrative Intelligence', subtitle: 'Emerging themes', icon: '🔍', layout: 'storytelling' },
      { id: 'performance', title: 'Performance KPIs', subtitle: 'Impact metrics', icon: '📊', layout: '2col' },
    ],
    pages: [
      {
        tabId: 'executive',
        heroConfig: { headline: `${brandName} Media Intelligence`, subline: `${dashboardType} — Reporting Period`, stat: '247', statLabel: 'Total Articles' },
        widgets: [
          { id: 'hero-1', type: 'hero-banner', title: `${brandName} Intelligence Report`, span: 3, headline: `${brandName} Media Intelligence`, subline: dashboardType },
          { id: 'kpi-1', type: 'kpi-card', title: 'Total Articles', value: '247', label: 'Mentions', delta: '+12%', deltaPos: true, icon: '📰', span: 1 },
          { id: 'kpi-2', type: 'kpi-card', title: 'Total Reach', value: '12.4M', label: 'Audience', delta: '+8%', deltaPos: true, icon: '👁️', span: 1 },
          { id: 'kpi-3', type: 'kpi-card', title: 'Sentiment Score', value: '72%', label: 'Positive', delta: '+4pts', deltaPos: true, icon: '💚', span: 1 },
          { id: 'chart-exec', type: 'chart', title: 'Coverage Overview', chartType: 'area', span: 3, xKey: 'month',
            rawChartData: months.map((m) => ({ month: m, articles: R(), reach: R() * 1000 })),
            series: [{ key: 'articles', label: 'Articles', color: primaryColor || '#7C3AED' }, { key: 'reach', label: 'Reach (K)', color: '#EC4899' }] },
          { id: 'insight-exec', type: 'insight', title: 'Executive Summary', span: 3,
            content: `${brandName} demonstrates strong media presence with 247 articles generating 12.4M in audience reach. Positive sentiment holds at 72%, reflecting effective brand management and favorable media relations throughout the reporting period.`,
            highlights: ['Coverage up 12% month-over-month', 'Positive sentiment majority across all channels', 'Strong tier-1 media representation'] },
        ],
      },
      {
        tabId: 'coverage',
        widgets: [
          { id: 'kpi-cov-1', type: 'kpi-card', title: 'Online News', value: '142', label: 'Articles', delta: '+18%', deltaPos: true, icon: '🌐', span: 1 },
          { id: 'kpi-cov-2', type: 'kpi-card', title: 'Print Media', value: '58', label: 'Articles', delta: '-3%', deltaPos: false, icon: '📄', span: 1 },
          { id: 'kpi-cov-3', type: 'kpi-card', title: 'Broadcast', value: '47', label: 'Segments', delta: '+7%', deltaPos: true, icon: '📺', span: 1 },
          { id: 'chart-cov-1', type: 'chart', title: 'Coverage by Channel', chartType: 'bar', span: 2, xKey: 'channel',
            rawChartData: [{ channel: 'Online', value: 142 }, { channel: 'Print', value: 58 }, { channel: 'Broadcast', value: 47 }],
            series: [{ key: 'value', label: 'Articles', color: primaryColor || '#7C3AED' }] },
          { id: 'chart-cov-2', type: 'chart', title: 'Media Type Share', chartType: 'pie', span: 1, xKey: 'type',
            rawChartData: [{ type: 'Online News', value: 45 }, { type: 'Print', value: 23 }, { type: 'Broadcast', value: 19 }, { type: 'Social', value: 13 }],
            series: [{ key: 'value', label: 'Share %', color: primaryColor || '#7C3AED' }] },
          { id: 'chart-cov-3', type: 'chart', title: 'Monthly Volume Trend', chartType: 'line', span: 3, xKey: 'month',
            rawChartData: months.map((m, i) => ({ month: m, articles: 30 + i * 8 + Math.floor(Math.random() * 10) })),
            series: [{ key: 'articles', label: 'Articles', color: primaryColor || '#7C3AED' }] },
        ],
      },
      {
        tabId: 'sentiment',
        widgets: [
          { id: 'kpi-sent-1', type: 'kpi-card', title: 'Positive', value: '72%', label: 'Sentiment', delta: '+4pts', deltaPos: true, icon: '✅', span: 1 },
          { id: 'kpi-sent-2', type: 'kpi-card', title: 'Neutral', value: '18%', label: 'Sentiment', delta: '-2pts', deltaPos: false, icon: '➡️', span: 1 },
          { id: 'kpi-sent-3', type: 'kpi-card', title: 'Negative', value: '10%', label: 'Sentiment', delta: '-2pts', deltaPos: true, icon: '⚠️', span: 1 },
          { id: 'chart-sent-1', type: 'chart', title: 'Sentiment Trend', chartType: 'area', span: 2, xKey: 'month',
            rawChartData: months.map((m) => ({ month: m, positive: R(), neutral: Math.floor(R() * 0.4), negative: Math.floor(R() * 0.2) })),
            series: [{ key: 'positive', label: 'Positive', color: '#16a34a' }, { key: 'neutral', label: 'Neutral', color: '#9ca3af' }, { key: 'negative', label: 'Negative', color: '#dc2626' }] },
          { id: 'chart-sent-2', type: 'chart', title: 'Sentiment Distribution', chartType: 'pie', span: 1, xKey: 'label',
            rawChartData: [{ label: 'Positive', value: 72 }, { label: 'Neutral', value: 18 }, { label: 'Negative', value: 10 }],
            series: [{ key: 'value', label: '%', color: '#16a34a' }] },
          { id: 'insight-sent', type: 'insight', title: 'Sentiment Analysis', span: 3,
            content: `${brandName}'s sentiment profile is predominantly positive at 72%, with negative coverage accounting for only 10% of total mentions. The trend shows consistent improvement over the reporting period.`,
            highlights: ['Positive sentiment 72% — above industry average', 'Negative coverage concentrated in financial topics', 'Crisis communications maintained brand equity'] },
        ],
      },
      {
        tabId: 'narratives',
        widgets: [
          { id: 'narrative-intro', type: 'narrative', title: 'Key Narratives', span: 3, content: `Five dominant narratives are shaping ${brandName}'s media presence this period. Innovation leadership drives the most positive coverage while competitive dynamics and market positioning generate ongoing discussion.`, highlights: [] },
          { id: 'chart-narr-1', type: 'chart', title: 'Narrative Share of Voice', chartType: 'bar', span: 2, xKey: 'theme',
            rawChartData: [{ theme: 'Innovation', count: 68 }, { theme: 'Market Position', count: 45 }, { theme: 'ESG', count: 38 }, { theme: 'Financial', count: 32 }, { theme: 'Partnerships', count: 25 }],
            series: [{ key: 'count', label: 'Articles', color: primaryColor || '#7C3AED' }] },
          { id: 'kpi-narr-1', type: 'kpi-card', title: 'Active Narratives', value: '5', label: 'Key themes', delta: '+2 new', deltaPos: true, icon: '💡', span: 1 },
          { id: 'chart-narr-2', type: 'chart', title: 'Narrative Velocity', chartType: 'line', span: 3, xKey: 'month',
            rawChartData: months.map((m) => ({ month: m, innovation: R(), market: Math.floor(R() * 0.8), esg: Math.floor(R() * 0.6) })),
            series: [{ key: 'innovation', label: 'Innovation', color: primaryColor || '#7C3AED' }, { key: 'market', label: 'Market', color: '#EC4899' }, { key: 'esg', label: 'ESG', color: '#3DD9D6' }] },
        ],
      },
      {
        tabId: 'performance',
        widgets: [
          { id: 'chart-perf-1', type: 'chart', title: 'Reach & Engagement', chartType: 'area', span: 2, xKey: 'month',
            rawChartData: months.map((m, i) => ({ month: m, reach: (1000 + i * 200) * 1000, engagement: R() * 500 })),
            series: [{ key: 'reach', label: 'Reach', color: primaryColor || '#7C3AED' }, { key: 'engagement', label: 'Engagement', color: '#F59E0B' }] },
          { id: 'chart-perf-2', type: 'chart', title: 'Score Tracker', chartType: 'radialBar', span: 1, xKey: 'label',
            rawChartData: [{ label: 'Sentiment', value: 72 }, { label: 'Reach', value: 84 }, { label: 'Engagement', value: 65 }],
            series: [{ key: 'value', label: 'Score', color: primaryColor || '#7C3AED' }] },
          { id: 'insight-perf', type: 'insight', title: 'Performance Summary', span: 3,
            content: `${brandName}'s media performance remains strong across key metrics. Reach has grown 8% month-over-month while engagement rates hold above sector benchmarks. The platform mix is shifting toward higher-quality digital outlets.`,
            highlights: ['Reach +8% MoM', 'Tier-1 coverage 34% of total', 'EMV estimated at $2.8M'] },
        ],
      },
    ],
    executiveInsights: {
      summary: `${brandName} maintains a strong media presence with positive momentum across all key metrics during the reporting period.`,
      keyFindings: ['Coverage volume up 12% month-over-month', 'Positive sentiment at 72% — 8pts above sector average', 'Innovation narrative dominates with 27% share of voice'],
      recommendations: ['Amplify ESG narrative to capitalise on positive reception', 'Address financial coverage through targeted communications'],
      risks: ['Competitive narratives gaining momentum in trade media'],
    },
  };
}

// ── Ensure all chart widgets have rawChartData ────────────────────────────────
function ensureChartData(config, brandName) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  for (const page of config.pages ?? []) {
    for (const widget of page.widgets ?? []) {
      if (widget.type === 'chart' && (!widget.rawChartData || widget.rawChartData.length === 0)) {
        widget.rawChartData = months.map((m) => ({ [widget.xKey ?? 'label']: m, value: Math.floor(Math.random() * 80 + 20) }));
        if (!widget.series?.length) {
          widget.series = [{ key: 'value', label: widget.title ?? 'Value', color: config.theme?.primaryColor ?? '#7C3AED' }];
        }
        if (!widget.xKey) widget.xKey = Object.keys(widget.rawChartData[0])[0];
      }
    }
  }
  return config;
}
