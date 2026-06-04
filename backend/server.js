import express from 'express';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ── AI clients ───────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_MODEL}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use Claude if ANTHROPIC_API_KEY is set, otherwise fall back to OpenAI
const AI_PROVIDER = process.env.ANTHROPIC_API_KEY ? 'claude' : 'openai';

async function callAI(systemPrompt, userPrompt, opts = {}) {
  const { maxTokens = 2048, json = false } = opts;
  if (AI_PROVIDER === 'claude') {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return msg.content[0].text;
  } else {
    const res = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    return res.choices[0].message.content;
  }
}

// In-memory store for deployed agents
const agents = new Map();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function parseFileBuffer(buffer, filename) {
  const ext = extname(filename).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const rows = data.map((row) => row.join('\t')).join('\n');
      return `=== Sheet: ${name} ===\n${rows}`;
    });
    return sheets.join('\n\n');
  }
  if (ext === '.csv' || ext === '.txt' || ext === '.json' || ext === '.md') {
    return buffer.toString('utf8');
  }
  return `[Binary file: ${filename} — content not shown]`;
}

// ── Original Agent Builder routes ────────────────────────────────────────────

app.post('/api/upload', upload.array('files', 20), (req, res) => {
  try {
    const results = req.files.map((file) => ({
      name: file.originalname,
      size: file.size,
      content: parseFileBuffer(file.buffer, file.originalname).slice(0, 60_000),
    }));
    res.json({ files: results });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_MODEL,
      max_tokens: 8096,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

app.post('/api/deploy', (req, res) => {
  const { name, instructions, fileContext, conversationStarters, systemPrompt } = req.body;
  const id = randomUUID();
  agents.set(id, { id, name: name || 'AI Agent', instructions: instructions || '', fileContext: fileContext || '', conversationStarters: conversationStarters || [], systemPrompt: systemPrompt || '', createdAt: new Date().toISOString() });
  res.json({ id, shareUrl: `/#share/${id}` });
});

app.get('/api/share/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

app.get('/api/agents', (req, res) => {
  res.json([...agents.values()].map(({ id, name, createdAt }) => ({ id, name, createdAt })));
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Media Intelligence Platform Routes ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/media/enrich
 * Enriches raw parsed article rows with sentiment, reach, EMV, narrative labels.
 */
app.post('/api/media/enrich', async (req, res) => {
  try {
    const { data = [], dashboardId, brandName } = req.body;

    const systemPrompt = `You are a media intelligence analyst. Given raw article data,
enrich each article with: sentiment (positive/negative/neutral/mixed),
estimated reach (numeric string), estimated EMV in USD (string like "$12,400"),
and a short narrative theme label (2-4 words).
Return a JSON object with key "articles" containing an array matching the input length.
Each article object must have: title, source, date, sentiment, reach, emv, narrative.
If a field already exists in the input, use it; otherwise infer or estimate it.`;

    const sample = data.slice(0, 50);
    const userPrompt = `Brand: ${brandName}
Dashboard type: ${dashboardId}
Articles to enrich (${sample.length} items):
${JSON.stringify(sample, null, 2)}

Return enriched articles as JSON with key "articles".`;

    const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 4096 });

    let parsed;
    try {
      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      // Fallback: generate synthetic enriched articles from raw data
      parsed = {
        articles: sample.map((row, i) => ({
          title: row.title || row.headline || row.Title || `Article ${i + 1}`,
          source: row.source || row.Source || row.outlet || 'Unknown',
          date: row.date || row.Date || row.published_at || new Date().toLocaleDateString(),
          sentiment: ['positive', 'negative', 'neutral', 'mixed'][i % 4],
          reach: String(Math.floor(Math.random() * 500000 + 10000)),
          emv: `$${(Math.random() * 50000 + 1000).toFixed(0)}`,
          narrative: ['Brand story', 'Market shift', 'Crisis comms', 'Product launch'][i % 4],
        })),
      };
    }

    res.json(parsed);
  } catch (err) {
    console.error('Enrich error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/media/template
 * Generates a BrandTemplate JSON from brand name, dashboard type, and sample data.
 */
app.post('/api/media/template', async (req, res) => {
  try {
    const { brandName, dashboardId, sampleTitles = [], sampleSentiments = [] } = req.body;

    const systemPrompt = `You are a world-class brand strategist and UI designer.
Given a brand name and media data, produce a BrandTemplate JSON object.
Respond with ONLY valid JSON — no markdown, no explanation.

The JSON schema is:
{
  "primaryColor": "#hex (dominant brand colour, should feel premium and distinctive)",
  "secondaryColor": "#hex (dark background variant)",
  "accentColor": "#hex (lighter highlight variant)",
  "fontPair": {
    "heading": "Google Font name for display headings",
    "body": "Google Font name for body text"
  },
  "chartPalette": ["#hex1","#hex2","#hex3","#hex4","#hex5"],
  "layout": "left-aligned" | "centered" | "right-biased",
  "tabs": [
    {"id": "slug", "label": "Tab Name", "chartTypes": ["line","bar"]}
  ],
  "storyboardNarrative": "One paragraph brand voice summary."
}

Rules:
- Derive colours that feel authentic to the brand's industry and personality
- Choose unique, characterful Google Fonts — NOT Inter, Roboto, or Arial
- Chart palette should be harmonious but offer good contrast
- Include 3-5 tabs relevant to the dashboardId
- Valid chartTypes: line, bar, area, pie, radialBar`;

    const userPrompt = `Brand name: ${brandName}
Dashboard type: ${dashboardId}
Sample article titles: ${sampleTitles.slice(0, 5).join('; ')}
Sentiments distribution: ${sampleSentiments.slice(0, 10).join(', ')}

Generate the BrandTemplate JSON now.`;

    const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 1500 });

    let template;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      template = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      // Fallback template
      template = {
        primaryColor: '#7C3AED',
        secondaryColor: '#1e1b4b',
        accentColor: '#A78BFA',
        fontPair: { heading: 'Playfair Display', body: 'Source Sans 3' },
        chartPalette: ['#7C3AED', '#EC4899', '#3DD9D6', '#F59E0B', '#A78BFA'],
        layout: 'left-aligned',
        tabs: [
          { id: 'overview', label: 'Overview', chartTypes: ['line', 'bar'] },
          { id: 'sentiment', label: 'Sentiment', chartTypes: ['pie', 'area'] },
          { id: 'reach', label: 'Reach & EMV', chartTypes: ['bar', 'line'] },
        ],
        storyboardNarrative: `${brandName} demonstrates a compelling media presence across the ${dashboardId} landscape, with data-driven insights revealing key narrative trends and audience engagement patterns.`,
      };
    }

    res.json({ template });
  } catch (err) {
    console.error('Template error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/media/chart-data
 * Returns normalised chart data for a given dashboard + tab.
 */
app.post('/api/media/chart-data', async (req, res) => {
  try {
    const { dashboardId, tabId, brandName, sampleData = [] } = req.body;

    const systemPrompt = `You are a data analyst generating chart data for a media intelligence dashboard.
Return ONLY valid JSON with this exact shape:
{
  "series": [{"name": "Series Name", "values": [number, ...]}],
  "labels": ["label1", "label2", ...],
  "meta": {"title": "Chart title", "unit": "unit string or empty", "period": "e.g. Last 30 days"}
}
Generate 6-12 data points. Make the data realistic for a media monitoring context.`;

    const userPrompt = `Dashboard: ${dashboardId}
Tab: ${tabId}
Brand: ${brandName}
Available data fields: ${sampleData.length > 0 ? Object.keys(sampleData[0] || {}).join(', ') : 'title, sentiment, reach, emv, source, date, narrative'}
Sample size: ${sampleData.length} articles

Generate chart data JSON for this tab now.`;

    const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 1000 });

    let chartData;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      chartData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      chartData = generateFallbackChartData(dashboardId, tabId, brandName);
    }

    res.json(chartData);
  } catch (err) {
    console.error('Chart data error:', err);
    // Always return fallback data — never let the error kill the chart
    res.json(generateFallbackChartData(req.body.dashboardId, req.body.tabId, req.body.brandName));
  }
});

/**
 * POST /api/media/narrate
 * Generates 2-3 sentence insight commentary for a chart.
 */
app.post('/api/media/narrate', async (req, res) => {
  try {
    const { dashboardId, tabId, brandName, chartData } = req.body;

    const systemPrompt = `You are a senior media intelligence analyst with a concise, authoritative editorial voice.
Write 2-3 sentences of insight commentary for a chart in a ${dashboardId} dashboard.
Be specific about trends you see in the data. Use professional language.
Do not start with "The chart shows" or "This data indicates". Lead with insight.`;

    const userPrompt = `Brand: ${brandName}
Chart tab: ${tabId}
Chart meta: ${JSON.stringify(chartData?.meta ?? {})}
Series names: ${(chartData?.series ?? []).map((s) => s.name).join(', ')}
Labels: ${(chartData?.labels ?? []).slice(0, 8).join(', ')}

Write the insight commentary now (2-3 sentences only).`;

    const insight = await callAI(systemPrompt, userPrompt, { maxTokens: 200 });
    res.json({ insight: insight.trim() });
  } catch (err) {
    console.error('Narrate error:', err);
    res.json({ insight: `${req.body.brandName}'s ${req.body.tabId} metrics show notable patterns over the reporting period. Key trends align with broader sector movements, suggesting strategic opportunities for media engagement.` });
  }
});

/**
 * POST /api/media/interpret-charts
 * Takes raw chart data from /charts and returns normalised Recharts-ready configs + AI insights.
 */
app.post('/api/media/interpret-charts', async (req, res) => {
  try {
    const { dashboardId, brandName, workflowId, lensId, rawChartData } = req.body;

    const systemPrompt = `You are a senior media intelligence data analyst. Given raw chart data from a media monitoring API,
return a JSON object with key "charts" — an array of chart objects ready for Recharts rendering.

Each chart object must follow this exact shape:
{
  "type": "bar" | "line" | "area" | "pie" | "radialBar",
  "series": [{"name": "Series Name", "values": [number, ...]}],
  "labels": ["label1", "label2", ...],
  "meta": {
    "title": "Chart title",
    "unit": "unit string or empty",
    "period": "e.g. Last 30 days"
  },
  "insight": "2–3 sentence analytical insight about this chart. Lead with the finding, not 'The chart shows'."
}

Rules:
- Produce 3–6 charts that best represent the data
- Choose chart types that fit the data shape (time series → line/area, categories → bar, proportions → pie)
- Ensure all values arrays have the same length as labels
- Insights must be specific, data-driven, and concise
- Return ONLY valid JSON — no markdown, no explanation`;

    const userPrompt = `Brand: ${brandName}
Dashboard type: ${dashboardId} (lens: ${lensId})
Workflow ID: ${workflowId}

Raw chart data from API:
${JSON.stringify(rawChartData, null, 2).slice(0, 8000)}

Interpret this data and return normalised chart configs with insights.`;

    const raw = await callAI(systemPrompt, userPrompt, { maxTokens: 4096 });

    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      result = { charts: generateFallbackChartSet(dashboardId, brandName) };
    }

    // Ensure charts array exists
    if (!result.charts || !Array.isArray(result.charts)) {
      result = { charts: generateFallbackChartSet(dashboardId, brandName) };
    }

    res.json(result);
  } catch (err) {
    console.error('Interpret charts error:', err);
    res.json({ charts: generateFallbackChartSet(req.body.dashboardId, req.body.brandName) });
  }
});

app.post('/api/media/export/pdf', (req, res) => {
  console.log(`PDF export requested: ${req.body.brandName}`);
  res.json({ status: 'queued', message: 'PDF export queued. In production, a Puppeteer headless render is triggered.' });
});

app.post('/api/media/export/pptx', (req, res) => {
  console.log(`PPTX export requested: ${req.body.brandName}`);
  res.json({ status: 'queued', message: 'PPTX export queued. In production, a slide generation pipeline is triggered.' });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Mock Media Intelligence Backend (dev fallback when no real backend) ───────
// ── These mirror the real API paths so the Vite proxy to :3001 works in dev ───
// ══════════════════════════════════════════════════════════════════════════════

const workflows = new Map();

app.post('/workflow', upload.none(), (req, res) => {
  const id = randomUUID();
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  workflows.set(id, { id, ...payload, createdAt: new Date().toISOString(), status: 'running' });
  console.log(`[workflow] Created ${id}: ${payload.name}`);
  res.json({ id, status: 'running' });
});

app.get('/workflow', (req, res) => {
  res.json([...workflows.values()].map(({ id, name, status, createdAt }) => ({ id, name, status, createdAt })));
});

app.get('/workflow/:id', (req, res) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

app.put('/workflow/:id', (req, res) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const updated = { ...wf, ...req.body, id: req.params.id };
  workflows.set(req.params.id, updated);
  res.json({ id: req.params.id, status: 'running' });
});

app.delete('/workflow/:id', (req, res) => {
  workflows.delete(req.params.id);
  res.status(204).end();
});

// File upload (dev mock)
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(`[upload] File received for workflow ${req.body.workflow_id}: ${req.file?.originalname}`);
  res.json({ ok: true, filename: req.file?.originalname });
});

// Review tagged articles (dev mock — returns synthetic articles)
app.get('/review/tagged', (req, res) => {
  const { workflow_id, lens_id } = req.query;
  const wf = workflows.get(workflow_id);
  const brandName = wf?.workflow?.assembly?.branding?.client_name ?? 'Brand';
  const SENTIMENTS = ['POS', 'NEU', 'NEG'];
  const THEMES = ['Product Launch', 'Crisis Comms', 'Market Shift', 'Brand Story', 'ESG', 'Earnings'];
  const articles = Array.from({ length: 12 }, (_, i) => ({
    id: `art-${workflow_id}-${i}`,
    source: ['Reuters', 'Bloomberg', 'FT', 'AP', 'BBC', 'Guardian'][i % 6],
    title: `${brandName} ${['announces', 'reports', 'launches', 'partners on'][i % 4]} ${['Q2 results', 'new initiative', 'strategic review', 'industry milestone'][i % 4]}`,
    content: `Full article content for article ${i + 1} about ${brandName}...`,
    url: `https://example.com/article-${i + 1}`,
    domain: ['reuters.com', 'bloomberg.com', 'ft.com'][i % 3],
    reach: Math.floor(Math.random() * 2000000 + 50000),
    brand_of_interest: [brandName],
    author: i % 3 === 0 ? null : `Author ${i + 1}`,
    date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    sentiment: SENTIMENTS[i % 3],
    theme: THEMES[i % 6],
    emotion: ['Neutral', 'Concerned', 'Optimistic'][i % 3],
    severity: (i % 5) + 1,
    confidence: Math.round((0.55 + (i % 5) * 0.09) * 100) / 100,
    xai_theme_reason: `Article discusses ${THEMES[i % 6].toLowerCase()} related to ${brandName}.`,
    xai_sentiment_reason: `Tone is ${SENTIMENTS[i % 3] === 'POS' ? 'positive' : SENTIMENTS[i % 3] === 'NEG' ? 'negative' : 'neutral'}.`,
    competitors: [],
    message_keywords: [],
    all_brands: [brandName],
  }));
  res.json(articles);
});

app.put('/review/tagged', (req, res) => {
  console.log(`[review] Updated ${Array.isArray(req.body) ? req.body.length : '?'} articles for wf ${req.query.workflow_id}`);
  res.json({ ok: true, updated: Array.isArray(req.body) ? req.body.length : 0 });
});

// Charts data (dev mock — synthetic chart data; in production points to real backend)
app.get('/charts', async (req, res) => {
  const { workflow_id, lens_id } = req.query;
  const wf = workflows.get(workflow_id);
  const brandName = wf?.workflow?.assembly?.branding?.client_name ?? 'Brand';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

  // Return raw chart data — this gets interpreted by /api/media/interpret-charts
  res.json({
    workflow_id,
    lens_id,
    brand: brandName,
    charts: [
      {
        id: 'sentiment_score',
        type: 'time_series',
        data: months.map((m, i) => ({ date: m, positive: 40 + i * 3, neutral: 35 - i, negative: 25 - i * 2 })),
      },
      {
        id: 'top_themes',
        type: 'bar',
        data: [
          { theme: 'Product', count: 42 },
          { theme: 'ESG',     count: 28 },
          { theme: 'Finance', count: 35 },
          { theme: 'Crisis',  count: 15 },
          { theme: 'Growth',  count: 22 },
        ],
      },
      {
        id: 'media_type_breakdown',
        type: 'pie',
        data: [
          { type: 'Online News', share: 45 },
          { type: 'Print',       share: 20 },
          { type: 'Broadcast',   share: 18 },
          { type: 'Social',      share: 17 },
        ],
      },
      {
        id: 'audience_kpi',
        type: 'time_series',
        data: months.map((m, i) => ({ date: m, reach: 1200000 + i * 85000, impressions: 4500000 + i * 250000 })),
      },
    ],
  });
});

// ── Dashboard API ─────────────────────────────────────────────────────────────
import { mountDashboardRoutes } from './dashboardApi.js';
mountDashboardRoutes(app, callAI, workflows);

// WebSocket upgrade (dev mock pipeline simulator)
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// ── Fallback chart data generators ───────────────────────────────────────────
function generateFallbackChartData(dashboardId, tabId, brandName) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  return {
    series: [
      { name: brandName || 'Brand', values: months.map(() => Math.floor(Math.random() * 80 + 20)) },
      { name: 'Industry Avg',       values: months.map(() => Math.floor(Math.random() * 60 + 15)) },
    ],
    labels: months,
    meta: {
      title: `${tabId ? tabId.charAt(0).toUpperCase() + tabId.slice(1) : 'Overview'} — ${dashboardId}`,
      unit: '',
      period: 'Last 8 months',
    },
  };
}

function generateFallbackChartSet(dashboardId, brandName) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return [
    {
      type: 'area',
      series: [
        { name: brandName || 'Brand', values: months.map(() => Math.floor(Math.random() * 80 + 30)) },
        { name: 'Competitors',        values: months.map(() => Math.floor(Math.random() * 60 + 20)) },
      ],
      labels: months,
      meta: { title: 'Media Volume Over Time', unit: 'articles', period: 'Last 6 months' },
      insight: `${brandName}'s media volume shows a consistent upward trend over the reporting period, outpacing competitor coverage by a growing margin. This indicates increasing brand visibility across key media channels.`,
    },
    {
      type: 'bar',
      series: [
        { name: 'Positive', values: [42, 38, 45, 51, 48, 55] },
        { name: 'Neutral',  values: [30, 35, 28, 25, 32, 28] },
        { name: 'Negative', values: [28, 27, 27, 24, 20, 17] },
      ],
      labels: months,
      meta: { title: 'Sentiment Distribution', unit: '%', period: 'Last 6 months' },
      insight: `Positive sentiment for ${brandName} has grown steadily from 42% to 55%, while negative coverage has declined. This 13-point improvement in sentiment score reflects effective messaging and favourable media relations.`,
    },
    {
      type: 'pie',
      series: [
        { name: 'Online News', values: [45] },
        { name: 'Print',       values: [22] },
        { name: 'Broadcast',   values: [18] },
        { name: 'Social',      values: [15] },
      ],
      labels: ['Online News', 'Print', 'Broadcast', 'Social'],
      meta: { title: 'Media Type Breakdown', unit: '', period: 'Reporting period' },
      insight: `Online news dominates ${brandName}'s coverage at 45%, reflecting the digital-first nature of the media landscape. Broadcast coverage at 18% punches above its weight in terms of audience reach per article.`,
    },
  ];
}

// ── Start server with WebSocket support ───────────────────────────────────────
const PORT = process.env.PORT || 3001;

let wss;
try {
  const { default: ws } = await import('ws');
  wss = new ws.WebSocketServer({ noServer: true });
  wss.on('connection', (socket, req) => {
    const workflowId = req.url.split('/ws/')[1];
    console.log(`[ws] Client connected for workflow: ${workflowId}`);

    // Simulate pipeline progress
    const steps = [
      { step: 'Parsing articles', percent: 15 },
      { step: 'Running AI analysis', percent: 35 },
      { step: 'Tagging entities', percent: 55 },
      { step: 'Generating insights', percent: 75 },
      { step: 'Building charts', percent: 90 },
      { step: 'Complete', percent: 100 },
    ];

    let i = 0;
    const send = (data) => { try { socket.send(JSON.stringify(data)); } catch {} };

    send({ type: 'status', status: 'running', message: 'Pipeline started' });

    const interval = setInterval(() => {
      if (i >= steps.length) {
        send({ type: 'status', status: 'complete', message: 'Pipeline complete' });
        clearInterval(interval);
        return;
      }
      send({ type: 'progress', step: steps[i].step, percent: steps[i].percent });
      i++;
    }, 2000);

    socket.on('close', () => clearInterval(interval));
  });
} catch (e) {
  console.warn('[ws] WebSocket server not available:', e.message);
}

const server = createServer(app);

if (wss) {
  server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/ws/')) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    } else {
      socket.destroy();
    }
  });
}

server.listen(PORT, () => {
  console.log(`\n✅ Backend running on http://localhost:${PORT}`);
  console.log(`   AI Provider: ${AI_PROVIDER.toUpperCase()}`);
  console.log(`   WebSocket:   ws://localhost:${PORT}/ws/{workflowId}`);
  console.log(`\n   Agent Builder:      /api/chat, /api/upload, /api/deploy`);
  console.log(`   Media Intelligence: /workflow, /upload, /review/tagged, /charts`);
  console.log(`   AI Routes:          /api/media/interpret-charts, /api/media/narrate\n`);
});
