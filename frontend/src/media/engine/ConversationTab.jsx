/**
 * ConversationTab — Generative UI conversation workspace.
 *
 * Inspired by Thesys Generative UI:
 * Every AI response renders as a structured document — not plain text —
 * composed of typed blocks: executive summaries, KPI grids, charts,
 * tables, insight cards, and recommendations.
 *
 * Features:
 * - Persistent conversation history (localStorage per workflowId:lensId)
 * - Generative UI block rendering (GenerativeUIRenderer)
 * - Fortune 500 executive output quality
 * - Download conversation as polished standalone HTML report
 * - Download individual response as HTML artifact
 * - Emil: scale(0.97) press states, ease-out entries, stagger
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Loader2, Download, FileText, Copy,
  Check, ChevronDown, ChevronUp, X, ExternalLink,
} from 'lucide-react';

import GenerativeUIRenderer from './GenerativeUIRenderer';

// ── Persistence ────────────────────────────────────────────────────────────────
const chatKey  = (wid, lid) => `gui:${wid}:${lid}`;
const loadHistory = (wid, lid) => {
  try { return JSON.parse(localStorage.getItem(chatKey(wid, lid)) ?? '[]'); }
  catch { return []; }
};
const saveHistory = (wid, lid, msgs) => {
  try { localStorage.setItem(chatKey(wid, lid), JSON.stringify(msgs.slice(-80))); }
  catch { /* storage full */ }
};

// ── Starters per lens ──────────────────────────────────────────────────────────
const STARTERS = {
  pr: [
    { emoji: '📊', text: 'Give me an executive summary of this period\'s PR performance' },
    { emoji: '📰', text: 'Show sentiment distribution and top publication reach' },
    { emoji: '🔥', text: 'What themes drove the most coverage? Show with a chart' },
    { emoji: '📋', text: 'Create a board-ready report with KPIs, charts and recommendations' },
  ],
  intelligence: [
    { emoji: '📈', text: 'Show article volume trend and sentiment breakdown' },
    { emoji: '🏆', text: 'Which publications matter most? Rank them with reach data' },
    { emoji: '💡', text: 'What are the key insights from this data period?' },
    { emoji: '📋', text: 'Generate an executive intelligence briefing' },
  ],
  default: [
    { emoji: '📊', text: 'Give me a complete executive summary with KPIs and charts' },
    { emoji: '💬', text: 'What is the overall sentiment picture? Show the data visually' },
    { emoji: '📈', text: 'Show coverage trends and publication breakdown' },
    { emoji: '📋', text: 'Generate a board-ready media intelligence report' },
  ],
};

// ── HTML Export — interactive charts via Chart.js CDN ─────────────────────────
function generateReportHTML(messages, brandName, workflowId, lensId, primaryColor) {
  const date = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
  const bold = s => String(s ?? '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Palette matching premium.css
  const PALETTE_JS = ['#8B5CF6','#3B82F6','#14B8A6','#EE72D8','#F97316','#06B6D4','#22C55E','#EAB308','#F43F5E','#6B7280'];
  const SENT_JS = { Positive:'#16A34A', Negative:'#F43F5E', Neutral:'#9CA3AF', POS:'#16A34A', NEG:'#F43F5E', NEU:'#9CA3AF' };

  // Collect Chart.js init scripts — assembled per chart block
  const chartScripts = [];
  let chartCount = 0;

  // ── Block → HTML (with canvas for charts) ────────────────────────────────
  function blockToHTML(block) {
    const b = block;
    switch (b.type) {

      case 'chart': {
        const data     = b.data ?? b.rawChartData ?? [];
        const xKey     = b.xKey ?? 'label';
        const series   = b.series ?? [];
        const cType    = b.chartType ?? 'bar';
        if (!data.length) return '';

        const id = `chart-${++chartCount}`;
        const labels = JSON.stringify(data.map(d => d[xKey]));

        // Infer series if not provided
        const activeSeries = series.length > 0 ? series
          : Object.keys(data[0] ?? {})
              .filter(k => k !== xKey && typeof data[0][k] === 'number')
              .map((k, i) => ({ key: k, label: k, color: PALETTE_JS[i % PALETTE_JS.length] }));

        // Datasets
        const datasets = activeSeries.map(s => {
          const values = JSON.stringify(data.map(d => d[s.key] ?? 0));
          const color  = SENT_JS[s.key] ?? SENT_JS[s.label] ?? s.color ?? PALETTE_JS[0];
          const hexAlpha = color + '40';

          if (cType === 'area') {
            return `{label:${JSON.stringify(s.label??s.key)},data:${values},borderColor:${JSON.stringify(color)},backgroundColor:${JSON.stringify(hexAlpha)},fill:true,tension:0.4,borderWidth:2.5,pointRadius:3,pointHoverRadius:6}`;
          }
          if (cType === 'line') {
            return `{label:${JSON.stringify(s.label??s.key)},data:${values},borderColor:${JSON.stringify(color)},backgroundColor:'transparent',tension:0.4,borderWidth:2.5,pointRadius:3,pointHoverRadius:6}`;
          }
          if (cType === 'bar' || cType === 'stacked-bar') {
            return `{label:${JSON.stringify(s.label??s.key)},data:${values},backgroundColor:${JSON.stringify(color + 'CC')},borderColor:${JSON.stringify(color)},borderWidth:1.5,borderRadius:5}`;
          }
          if (cType === 'horizontal-bar') {
            return `{label:${JSON.stringify(s.label??s.key)},data:${values},backgroundColor:${JSON.stringify(color + 'CC')},borderColor:${JSON.stringify(color)},borderWidth:1.5,borderRadius:4}`;
          }
          // pie / donut / sov
          const allColors = data.map((_,i) => PALETTE_JS[i % PALETTE_JS.length]);
          return `{label:${JSON.stringify(s.label??s.key)},data:${values},backgroundColor:${JSON.stringify(allColors)},borderWidth:2,borderColor:'#fff',hoverOffset:8}`;
        });

        // Chart.js type
        const cjsType = (() => {
          if (cType === 'area' || cType === 'line') return 'line';
          if (cType === 'pie' || cType === 'sov') return 'pie';
          if (cType === 'donut') return 'doughnut';
          return 'bar';
        })();

        // Options
        const isHoriz = cType === 'horizontal-bar' || cType === 'sentiment-bar';
        const isStacked = cType === 'stacked-bar';
        const optExtra = isHoriz ? `indexAxis:'y',` : '';
        const stackOpt = isStacked ? `stacked:true,` : '';

        const script = `
(function(){
  var ctx = document.getElementById(${JSON.stringify(id)}).getContext('2d');
  new Chart(ctx, {
    type: ${JSON.stringify(cjsType)},
    data: { labels: ${labels}, datasets: [${datasets.join(',')}] },
    options: {
      responsive: true, maintainAspectRatio: true,
      aspectRatio: ${['pie','donut','sov'].includes(cType) ? 1.8 : 2.5},
      ${optExtra}
      plugins: {
        legend: { display: ${activeSeries.length > 1 || cjsType === 'pie' || cjsType === 'doughnut'}, position: 'bottom',
          labels: { font: { family: "'DM Sans', system-ui", size: 11 }, usePointStyle: true, pointStyleWidth: 8 } },
        tooltip: {
          backgroundColor: '#fff', titleColor: '#0C0D12', bodyColor: '#374151',
          borderColor: 'rgba(0,0,0,0.10)', borderWidth: 1,
          titleFont: { family: "'Bricolage Grotesque', 'DM Sans'", weight: '700', size: 12 },
          bodyFont: { family: "'DM Sans', system-ui", size: 12 },
          padding: 10, cornerRadius: 10,
          callbacks: { label: function(ctx){ return ' ' + ctx.dataset.label + ': ' + (ctx.parsed.y ?? ctx.parsed ?? ctx.raw).toLocaleString(); } }
        }
      },
      scales: ${cjsType === 'pie' || cjsType === 'doughnut' ? 'undefined' : `{
        x: { ${isStacked ? 'stacked:true,' : ''} grid: { display: false }, ticks: { font: { family: "'DM Sans'", size: 11 }, color: '#9CA3AF' }, border: { display: false } },
        y: { ${isStacked ? 'stacked:true,' : ''} grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'DM Sans'", size: 11 }, color: '#9CA3AF' }, border: { display: false } }
      }`}
    }
  });
})();`;
        chartScripts.push(script);

        const hasSpikeMarkers = (b.dateInsights ?? []).length > 0;
        const spikeHTML = hasSpikeMarkers ? `
          <div class="spike-legend">
            ${(b.dateInsights ?? []).filter(di => di.title !== 'Quiet day').slice(0,4).map(di => `
              <div class="spike-item">
                <span class="spike-icon">✦</span>
                <span class="spike-date">${di.date}</span>
                <span class="spike-label">${di.title}</span>
                <span class="spike-desc">${di.summary?.slice(0,90) ?? ''}${(di.summary?.length ?? 0) > 90 ? '…' : ''}</span>
              </div>`).join('')}
          </div>` : '';

        return `<div class="block chart-block">
          <div class="chart-block-header">
            <div class="chart-accent"></div>
            <div>
              <h3 class="chart-title">${b.title ?? ''}</h3>
              ${b.subtitle ? `<span class="chart-subtitle">— ${b.subtitle}</span>` : ''}
            </div>
          </div>
          <div class="chart-wrap">
            <canvas id="${id}" height="${['pie','donut','sov'].includes(cType) ? 100 : 220}"></canvas>
          </div>
          ${spikeHTML}
          ${b.insight ? `<div class="chart-insight"><span class="insight-star">✦</span><p>${bold(b.insight)}</p></div>` : ''}
          ${b.analysis ? `<details class="analysis-details"><summary>Deep Analysis</summary><div class="analysis-body">${
            b.analysis.split(/\\n|\n/).filter(Boolean).map(line => {
              const isBullet = /^[-•]/.test(line.trimStart());
              const clean = isBullet ? line.replace(/^[\s\-•]+/,'') : line;
              return isBullet ? `<div class="analysis-bullet">${bold(clean)}</div>` : `<p>${bold(clean)}</p>`;
            }).join('')
          }</div></details>` : ''}
        </div>`;
      }

      case 'executive_summary':
        return `<div class="block exec-block">
          ${b.badge ? `<div class="exec-badge">${b.badge}</div>` : ''}
          <h2>${bold(b.headline ?? '')}</h2>
          ${b.subline ? `<p class="subline">${bold(b.subline)}</p>` : ''}
          ${b.points?.length ? `<ul>${b.points.map(p=>`<li>${bold(p)}</li>`).join('')}</ul>` : ''}
        </div>`;

      case 'kpi_grid':
        return `<div class="block kpi-grid">
          ${(b.kpis ?? []).map((k,i) => `
            <div class="kpi-card" style="border-top-color:${PALETTE_JS[i%PALETTE_JS.length]}">
              <div class="kpi-label">${k.label}</div>
              <div class="kpi-value" style="color:${PALETTE_JS[i%PALETTE_JS.length]}">${k.value}</div>
              ${k.delta ? `<div class="kpi-delta">${k.delta}</div>` : ''}
              ${k.subtext ? `<div class="kpi-sub">${k.subtext}</div>` : ''}
            </div>`).join('')}
        </div>`;

      case 'table': {
        const cols = b.columns ?? [];
        const rows = b.rows ?? [];
        return `<div class="block table-block">
          ${b.title ? `<h3>${b.title}</h3>` : ''}
          <div class="table-wrap"><table>
            <thead><tr>${cols.map(c=>`<th>${c.label??c.key??c}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(row=>`<tr>${cols.map(c=>{
              const k=c.key??c; const v=row[k]??'—';
              const isSent = k.toLowerCase().includes('sentiment');
              const cls = isSent ? `class="sent-${String(v).toLowerCase().slice(0,3)}"` : '';
              return `<td ${cls}>${typeof v==='number' ? v.toLocaleString() : v}</td>`;
            }).join('')}</tr>`).join('')}</tbody>
          </table></div>
        </div>`;
      }

      case 'insight_card':
        return `<div class="block insight-block priority-${(b.priority ?? 'MEDIUM').toLowerCase()}">
          <div class="insight-header">
            <span class="priority-badge">${b.priority ?? 'INSIGHT'}</span>
            <h3>${b.title ?? ''}</h3>
          </div>
          ${b.content ? `<p>${bold(b.content)}</p>` : ''}
          ${b.bullets?.length ? `<ul>${b.bullets.map(bl=>`<li>${bold(bl)}</li>`).join('')}</ul>` : ''}
        </div>`;

      case 'recommendation':
        return `<div class="block rec-block">
          <div class="rec-priority">${b.priority ?? 'MEDIUM'} PRIORITY</div>
          <h3>${b.title ?? ''}</h3>
          ${b.rationale ? `<p class="rationale">${bold(b.rationale)}</p>` : ''}
          ${b.action ? `<div class="action">→ ${bold(b.action)}</div>` : ''}
        </div>`;

      case 'narrative':
        return `<div class="block narrative-block">
          <div class="narrative-meta">${b.chapter??''} ${b.theme??''}</div>
          <h3>${b.title??''}</h3>
          ${b.content ? `<p>${bold(b.content)}</p>` : ''}
        </div>`;

      case 'text':
        return b.content ? `<div class="block text-block"><p>${bold(b.content)}</p></div>` : '';

      default: return '';
    }
  }

  const blocksHTML = messages.map(msg => {
    if (msg.role === 'user') {
      return `<div class="msg user-msg"><div class="msg-bubble">${msg.content ?? ''}</div></div>`;
    }
    const blockHTML = (msg.blocks ?? []).map(blockToHTML).join('');
    return `<div class="msg ai-msg">
      <div class="ai-label">✦ PR Solutions</div>
      <div class="ai-response">${msg.content ? `<p class="ai-text">${bold(msg.content)}</p>` : ''}${blockHTML}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brandName} — Media Intelligence Report · ${date}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--primary:${primaryColor};--ink:#0C0D12;--ink-2:#3C404F;--ink-3:#737888;--border:rgba(0,0,0,0.08);--bg:#F7F8FC}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
.page{max-width:920px;margin:0 auto;padding:48px 32px 80px}
/* Header */
.report-header{background:#fff;border:1px solid var(--border);border-radius:16px;padding:28px 32px;margin-bottom:32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);position:relative;overflow:hidden}
.report-header::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${primaryColor},${primaryColor}80)}
.report-brand{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;color:var(--ink);letter-spacing:-0.03em;margin-bottom:6px}
.report-meta{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.report-meta span{font-size:13px;color:var(--ink-3)}
.report-badge{display:inline-block;padding:3px 10px;border-radius:50px;background:${primaryColor}15;color:${primaryColor};font-size:10.5px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase}
/* Messages */
.msg{margin-bottom:24px}
.user-msg{display:flex;justify-content:flex-end}
.msg-bubble{background:linear-gradient(135deg,${primaryColor},${primaryColor}CC);color:#fff;padding:11px 16px;border-radius:14px 14px 4px 14px;max-width:68%;font-size:14px;line-height:1.55}
.ai-label{font-family:'Bricolage Grotesque',sans-serif;font-size:12px;font-weight:700;color:${primaryColor};margin-bottom:8px}
.ai-response{display:flex;flex-direction:column;gap:12px}
.ai-text{font-size:14px;color:var(--ink-2);line-height:1.65;background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 16px}
/* Blocks */
.block{background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px 20px;box-shadow:0 1px 6px rgba(0,0,0,0.05)}
/* Exec */
.exec-block{border-top:3px solid ${primaryColor}}
.exec-block h2{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.02em;margin:8px 0 6px}
.exec-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 9px;border-radius:50px;background:${primaryColor}15;color:${primaryColor};margin-bottom:8px}
.subline{font-size:13.5px;color:var(--ink-2);line-height:1.6;margin-bottom:12px}
.exec-block ul{list-style:none;display:flex;flex-direction:column;gap:6px;padding:0}
.exec-block li{font-size:13px;color:var(--ink-2);line-height:1.6;padding-left:14px;position:relative}
.exec-block li::before{content:'';position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:${primaryColor}}
/* KPI */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;background:transparent;border:none;padding:0;box-shadow:none}
.kpi-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;border-top:3px solid;box-shadow:0 1px 4px rgba(0,0,0,0.05)}
.kpi-label{font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px}
.kpi-value{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.03em;line-height:1;margin-bottom:4px}
.kpi-delta{font-size:11.5px;font-weight:600;color:#16A34A}
.kpi-sub{font-size:11px;color:var(--ink-3);margin-top:3px}
/* Chart */
.chart-block{overflow:hidden}
.chart-block-header{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.chart-accent{width:3px;height:18px;border-radius:3px;background:${primaryColor};flex-shrink:0}
.chart-title{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;color:var(--ink);letter-spacing:-0.01em}
.chart-subtitle{font-size:11.5px;color:var(--ink-3)}
.chart-wrap{position:relative;width:100%;padding-bottom:0}
.chart-wrap canvas{width:100%!important}
.chart-insight{display:flex;align-items:flex-start;gap:7px;padding:10px 0 0;border-top:1px solid rgba(0,0,0,0.06);margin-top:12px}
.insight-star{color:${primaryColor};font-size:12px;flex-shrink:0;margin-top:1px}
.chart-insight p{font-size:12px;color:var(--ink-2);line-height:1.55;margin:0}
/* Spike legend */
.spike-legend{display:flex;flex-direction:column;gap:6px;margin-top:10px;padding:10px 12px;background:#F7F8FC;border-radius:8px;border:1px solid rgba(0,0,0,0.06)}
.spike-item{display:grid;grid-template-columns:14px 90px 80px 1fr;align-items:center;gap:8px;font-size:11.5px}
.spike-icon{color:${primaryColor};font-weight:900}
.spike-date{font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--ink)}
.spike-label{font-weight:700;color:${primaryColor}}
.spike-desc{color:var(--ink-3);line-height:1.4}
/* Analysis accordion */
.analysis-details{margin-top:10px;border-top:1px solid rgba(0,0,0,0.06);padding-top:8px}
.analysis-details summary{font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:${primaryColor};cursor:pointer;padding:4px 0;outline:none}
.analysis-body{padding-top:8px;display:flex;flex-direction:column;gap:6px}
.analysis-body p,.analysis-bullet{font-size:12.5px;color:var(--ink-2);line-height:1.6}
.analysis-bullet{display:flex;gap:8px;align-items:flex-start;padding-left:0}
.analysis-bullet::before{content:'';display:block;width:4px;height:4px;border-radius:50%;background:${primaryColor};flex-shrink:0;margin-top:8px}
/* Table */
.table-block h3{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;letter-spacing:-0.01em;margin-bottom:10px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:400px}
th{padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-3);background:#F7F8FC;border-bottom:1px solid var(--border)}
td{padding:9px 12px;border-bottom:1px solid rgba(0,0,0,0.05);color:#374151}
tr:hover td{background:#FAFBFC}
.sent-pos{color:#16A34A;font-weight:600}.sent-neg{color:#E11D48;font-weight:600}.sent-neu{color:#737888}
/* Insight */
.insight-block h3{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;letter-spacing:-0.01em;margin-bottom:6px}
.insight-block{border-left:4px solid}
.priority-high{border-color:#E11D48}.priority-medium{border-color:#EA580C}.priority-low{border-color:#0891B2}
.insight-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.priority-badge{font-size:9.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:2px 7px;border-radius:50px;background:#FFF1F2;color:#E11D48}
.insight-block p{font-size:13px;color:var(--ink-2);line-height:1.65}
.insight-block ul{list-style:none;padding:0;margin-top:8px;display:flex;flex-direction:column;gap:5px}
.insight-block li{font-size:12.5px;color:#4B5563;line-height:1.55;padding-left:14px;position:relative}
.insight-block li::before{content:'';position:absolute;left:0;top:8px;width:4px;height:4px;border-radius:50%;background:#E11D48}
/* Recommendation */
.rec-block h3{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;letter-spacing:-0.01em}
.rec-block{background:${primaryColor}06;border:1.5px solid ${primaryColor}25}
.rec-priority{font-size:9.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${primaryColor};margin-bottom:5px}
.rationale{font-size:13px;color:#4B5563;line-height:1.6;margin:8px 0}
.action{font-size:13px;font-weight:600;color:${primaryColor}}
/* Narrative */
.narrative-block h3{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;letter-spacing:-0.01em;margin-bottom:6px}
.narrative-meta{font-size:11px;font-weight:600;color:var(--ink-3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em}
.text-block p{font-size:14px;color:var(--ink-2);line-height:1.7}
/* Footer */
.report-footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--border);text-align:center;font-size:12px;color:var(--ink-3)}
strong{font-weight:700}
@media print{body{background:#fff}.page{padding:20px}}
</style>
</head>
<body>
<div class="page">
  <div class="report-header">
    <div class="report-brand">${brandName}</div>
    <div class="report-meta">
      <span>📅 ${date}</span>
      <span>📊 Media Intelligence Report</span>
      <span class="report-badge">Confidential</span>
    </div>
  </div>
  ${blocksHTML}
  <div class="report-footer">
    Generated by PR Solutions · Media Intelligence Platform · ${date}
  </div>
</div>
<script>
${chartScripts.join('\n')}
</script>
</body>
</html>`;
}

function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Widget → GenUI block converter ────────────────────────────────────────────
/**
 * Converts dashboard config pages widgets into Generative UI blocks.
 * Handles: kpi-card, chart (+ dateInsights), insight (+ highlights), hero-banner, narrative.
 */
function widgetToBlock(w) {
  if (!w) return null;
  switch (w.type) {
    case 'kpi-card':
      // Collect into kpi_grid batches — individual kpi returned, grouped later
      return {
        _kpi: true,
        label: w.label ?? w.title ?? '',
        value: w.value ?? '',
        delta: w.delta ?? null,
        deltaPos: w.deltaPos ?? null,
        subtext: w.insight ? w.insight.slice(0, 80) : null,
        color: w.series?.[0]?.color,
      };
    case 'chart':
      return {
        type: 'chart',
        chartType: w.chartType ?? 'bar',
        title: w.title ?? '',
        subtitle: w.subtitle,
        xKey: w.xKey ?? 'label',
        data: w.rawChartData ?? [],
        series: w.series ?? [],
        insight: w.insight ?? null,
        analysis: w.analysis ?? null,
        dateInsights: w.dateInsights ?? [],
      };
    case 'insight':
    case 'narrative':
      return {
        type: 'insight_card',
        icon: '✦',
        title: w.title ?? '',
        priority: 'MEDIUM',
        content: w.content ?? '',
        bullets: w.highlights ?? [],
      };
    case 'hero-banner':
      return {
        type: 'executive_summary',
        headline: w.headline ?? w.title ?? '',
        subline: w.subline ?? w.content ?? '',
        badge: 'INFO',
        points: w.highlights ?? [],
      };
    default:
      return null;
  }
}

/**
 * Extracts blocks from config.pages[0].widgets (first/active tab).
 * Groups kpi-card widgets into a single kpi_grid block.
 * Skips widgets whose titles already appear in aiBlocks (dedup).
 */
function extractConfigBlocks(config, existingBlocks = []) {
  if (!config?.pages?.length) return [];

  const existingTitles = new Set(
    existingBlocks.map(b => (b.title ?? '').toLowerCase())
  );

  // Use first page (overview); it has the most representative widgets
  const firstPage = config.pages[0];
  if (!firstPage?.widgets?.length) return [];

  const kpiCards = [];
  const otherBlocks = [];

  for (const w of firstPage.widgets) {
    const converted = widgetToBlock(w);
    if (!converted) continue;

    if (converted._kpi) {
      kpiCards.push(converted);
    } else {
      // Skip if AI blocks already have this chart
      const titleLower = (converted.title ?? '').toLowerCase();
      if (!existingTitles.has(titleLower)) {
        otherBlocks.push(converted);
      }
    }
  }

  const result = [];

  // Group all KPI cards into one kpi_grid block
  if (kpiCards.length > 0) {
    result.push({
      type: 'kpi_grid',
      kpis: kpiCards.map(k => ({
        label:    k.label,
        value:    k.value,
        delta:    k.delta,
        deltaPos: k.deltaPos,
        subtext:  k.subtext,
        color:    k.color,
      })),
    });
  }

  result.push(...otherBlocks);
  return result;
}

/** Remove duplicate blocks by title (keep first occurrence) */
function dedupeBlocks(blocks) {
  const seen = new Set();
  return blocks.filter(b => {
    const key = `${b.type}:${(b.title ?? '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ConversationTab({ workflowId, lensId, brandName, dashboardId, lc, grad, chartPalette, initialMessage, onInitialMessageConsumed }) {
  const [messages,  setMessages]  = useState(() => loadHistory(workflowId, lensId));
  const [input,     setInput]     = useState('');
  const [thinking,  setThinking]  = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [exporting, setExporting] = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const blockRefsMap = useRef({});  // message id → block refs

  const starters = STARTERS[dashboardId] ?? STARTERS.default;

  useEffect(() => { saveHistory(workflowId, lensId, messages); }, [messages, workflowId, lensId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  // Auto-send when Ask AI seeds a message from a chart
  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
      // Small delay so the tab transition completes before sending
      const t = setTimeout(() => {
        sendMessage(initialMessage);
        onInitialMessageConsumed?.();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [initialMessage]); // eslint-disable-line

  async function sendMessage(text) {
    const msg = (text ?? input).trim();
    if (!msg || thinking) return;
    setInput('');

    const userMsg = { id: `u-${Date.now()}`, role:'user', content:msg, ts:new Date().toISOString(), blocks:[] };
    setMessages(prev => [...prev, userMsg]);
    setThinking(true);

    try {
      const lensParam = lensId ? `?lens_id=${lensId}` : '';
      const res  = await fetch(`/api/dashboard/${workflowId}/chat${lensParam}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          message: msg,
          conversationHistory: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();

      // Merge blocks from two sources:
      // 1. data.blocks — direct AI blocks (charts/KPIs the AI explicitly generated)
      // 2. data.config.pages widgets — full dashboard content (KPIs, charts+dateInsights, insights+highlights)
      // Show blocks first, then config-derived blocks (deduped by chart title)
      const aiBlocks = data.blocks ?? [];
      const configBlocks = extractConfigBlocks(data.config, aiBlocks);
      const mergedBlocks = dedupeBlocks([...aiBlocks, ...configBlocks]);

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message ?? '',
        blocks: mergedBlocks,
        chatWidgets: data.chatWidgets ?? [],
        changesApplied: data.changesApplied ?? 0,
        ts: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id:`e-${Date.now()}`, role:'assistant',
        content:`Something went wrong: ${err.message}`,
        blocks:[], ts:new Date().toISOString(),
      }]);
    } finally {
      setThinking(false);
    }
  }

  function exportFullReport() {
    setExporting(true);
    const html = generateReportHTML(messages, brandName ?? 'Brand', workflowId, lensId, lc.g1);
    const safe = (brandName ?? 'report').toLowerCase().replace(/[^a-z0-9]/g,'-');
    downloadHTML(html, `${safe}-media-intelligence-report.html`);
    setTimeout(() => setExporting(false), 1500);
  }

  function clearConversation() {
    setMessages([]);
    localStorage.removeItem(chatKey(workflowId, lensId));
  }

  // Stats
  const totalBlocks = messages.reduce((s,m) => s + (m.blocks?.length ?? 0), 0);
  const totalCharts = messages.reduce((s,m) => s + (m.blocks?.filter(b => b.type==='chart').length ?? 0), 0);
  const totalKpis   = messages.reduce((s,m) => s + (m.blocks?.filter(b => b.type==='kpi_grid').length ?? 0), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:'#F7F8FC' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.07)',
        padding:'10px 24px', display:'flex', alignItems:'center', gap:12, flexShrink:0,
      }}>
        <div style={{
          width:34, height:34, borderRadius:10,
          background:grad, display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 12px ${lc.g1}35`, flexShrink:0,
        }}>
          <Sparkles size={16} color="#fff"/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
            fontSize:14, fontWeight:700, color:'#0C0D12', letterSpacing:'-0.01em' }}>
            AI Intelligence Chat
          </div>
          <div style={{ fontSize:11, color:'#737888', fontFamily:'DM Sans, system-ui, sans-serif' }}>
            {brandName} · Generative analytics · {messages.filter(m=>m.role==='user').length} questions
          </div>
        </div>

        {/* Stats pills */}
        {totalBlocks > 0 && (
          <div style={{ display:'flex', gap:6 }}>
            {[
              { label:`${totalCharts} charts`, show: totalCharts > 0 },
              { label:`${totalKpis} KPI sets`, show: totalKpis > 0 },
            ].filter(s=>s.show).map(({ label },i) => (
              <span key={i} style={{
                fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50,
                background:`${lc.g1}12`, color:lc.g1,
                fontFamily:'DM Sans, system-ui, sans-serif',
              }}>{label}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:6 }}>
          {messages.length > 0 && (
            <button
              onClick={exportFullReport}
              disabled={exporting}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 14px', borderRadius:8, border:'none',
                background:grad, color:'#fff',
                fontSize:12.5, fontWeight:600, cursor:'pointer',
                fontFamily:'DM Sans, system-ui, sans-serif',
                boxShadow:`0 2px 8px ${lc.g1}30`,
                transition:'all 0.15s cubic-bezier(0.23,1,0.32,1)',
                opacity: exporting ? 0.7 : 1,
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {exporting ? <Loader2 size={13} style={{ animation:'pm-rotate 0.7s linear infinite' }}/> : <Download size={13}/>}
              {exporting ? 'Exporting…' : 'Export HTML'}
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              style={{
                padding:'7px 11px', borderRadius:8,
                border:'1px solid rgba(0,0,0,0.09)', background:'transparent',
                fontSize:12.5, color:'#737888', cursor:'pointer',
                fontFamily:'DM Sans, system-ui, sans-serif',
                transition:'all 0.15s',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div style={{
        flex:1, overflowY:'auto', padding:'24px 28px',
        display:'flex', flexDirection:'column', gap:24,
        scrollbarWidth:'thin', scrollbarColor:'rgba(0,0,0,0.12) transparent',
      }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.35, ease:[0.23,1,0.32,1] }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', flex:1, padding:'40px 20px', textAlign:'center' }}>
            <div style={{
              width:56, height:56, borderRadius:16, background:grad,
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:18, boxShadow:`0 8px 28px ${lc.g1}35`,
            }}>
              <Sparkles size={26} color="#fff"/>
            </div>
            <h2 style={{ fontFamily:'Bricolage Grotesque, DM Sans, sans-serif',
              fontSize:22, fontWeight:800, color:'#0C0D12', margin:'0 0 8px',
              letterSpacing:'-0.02em' }}>
              Intelligence at your command
            </h2>
            <p style={{ fontSize:14, color:'#737888', maxWidth:420, lineHeight:1.65,
              margin:'0 0 28px', fontFamily:'DM Sans, system-ui, sans-serif' }}>
              Ask questions and receive executive-quality responses with live charts,
              KPI summaries, tables, and actionable recommendations.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
              maxWidth:600, width:'100%' }}>
              {starters.map((s, i) => (
                <motion.button key={i}
                  onClick={() => sendMessage(s.text)}
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.08 + i*0.07, duration:0.28, ease:[0.23,1,0.32,1] }}
                  style={{
                    padding:'13px 16px', borderRadius:12, textAlign:'left',
                    border:'1.5px solid rgba(0,0,0,0.09)', background:'#fff',
                    fontSize:13, color:'#3C404F', cursor:'pointer',
                    fontFamily:'DM Sans, system-ui, sans-serif', lineHeight:1.45,
                    boxShadow:'0 1px 6px rgba(0,0,0,0.05)',
                    transition:'all 0.15s cubic-bezier(0.23,1,0.32,1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=lc.g1; e.currentTarget.style.boxShadow=`0 4px 16px ${lc.g1}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.09)'; e.currentTarget.style.boxShadow='0 1px 6px rgba(0,0,0,0.05)'; }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <span style={{ marginRight:7 }}>{s.emoji}</span>
                  {s.text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message stream */}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isLast={idx === messages.length - 1}
            lc={lc}
            grad={grad}
            primaryColor={lc.g1}
            onExportMessage={() => {
              const html = generateReportHTML([msg], brandName ?? 'Brand', workflowId, lensId, lc.g1);
              downloadHTML(html, `response-${idx+1}.html`);
            }}
          />
        ))}

        {/* Thinking indicator */}
        <AnimatePresence>
          {thinking && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0 }} transition={{ duration:0.2 }}
              style={{ display:'flex', flexDirection:'column', gap:8, maxWidth:720 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:8, background:grad,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Sparkles size={12} color="#fff"/>
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:'#3C404F',
                  fontFamily:'Bricolage Grotesque, DM Sans, sans-serif' }}>PR Solutions</span>
              </div>
              <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)',
                borderRadius:14, padding:'14px 18px', display:'flex', gap:5,
                alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                {[0,1,2].map(i => (
                  <span key={i} className="pm-thinking-dot"
                    style={{ animationDelay:`${i*0.16}s` }}/>
                ))}
                <span style={{ fontSize:12, color:'#737888', marginLeft:6,
                  fontFamily:'DM Sans, system-ui, sans-serif' }}>Generating intelligence…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef}/>
      </div>

      {/* ── Input bar ────────────────────────────────────────────────── */}
      <div style={{
        background:'#fff', borderTop:'1px solid rgba(0,0,0,0.07)',
        padding:'14px 24px 16px', flexShrink:0,
      }}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'#F7F8FC', border:'1.5px solid rgba(0,0,0,0.10)',
          borderRadius:14, padding:'9px 10px 9px 18px',
          transition:'border-color 0.15s, box-shadow 0.15s',
        }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor=lc.g1;
            e.currentTarget.style.boxShadow=`0 0 0 3px ${lc.g1}20`;
            e.currentTarget.style.background='#fff';
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor='rgba(0,0,0,0.10)';
            e.currentTarget.style.boxShadow='none';
            e.currentTarget.style.background='#F7F8FC';
          }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask for executive summaries, charts, recommendations, or insights…"
            disabled={thinking}
            style={{
              flex:1, border:'none', background:'transparent',
              fontSize:14, fontFamily:'DM Sans, system-ui, sans-serif', color:'#0C0D12',
              outline:'none', lineHeight:1.4,
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || thinking}
            style={{
              width:38, height:38, borderRadius:10, border:'none',
              background: !input.trim() || thinking ? '#E5E7EB' : grad,
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              cursor: !input.trim() || thinking ? 'not-allowed' : 'pointer',
              flexShrink:0, transition:'all 0.15s cubic-bezier(0.23,1,0.32,1)',
              boxShadow: !input.trim() || thinking ? 'none' : `0 4px 12px ${lc.g1}35`,
            }}
            onMouseDown={e => { if (!e.currentTarget.disabled) e.currentTarget.style.transform='scale(0.93)'; }}
            onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
            {thinking ? <Loader2 size={15} style={{ animation:'pm-rotate 0.7s linear infinite' }}/> : <Send size={15}/>}
          </button>
        </div>
        {/* Quick chips */}
        <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
          {[
            { label:'📊 Executive summary', msg:'Create a complete executive summary with KPIs, sentiment chart, and top 3 recommendations' },
            { label:'📈 Trend analysis',    msg:'Show sentiment and coverage trends over time as area charts' },
            { label:'🏆 Top performers',    msg:'Show top publications by reach and sentiment as a ranked table' },
            { label:'⚠️ Risk signals',      msg:'Identify any brand risk signals or negative sentiment spikes in the data' },
          ].map(({ label, msg }, i) => (
            <button key={i} onClick={() => sendMessage(msg)}
              style={{
                padding:'5px 11px', borderRadius:50,
                border:'1px solid rgba(0,0,0,0.09)', background:'#fff',
                fontSize:11.5, fontWeight:500, color:'#3C404F',
                cursor:'pointer', fontFamily:'DM Sans, system-ui, sans-serif',
                transition:'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=lc.g1; e.currentTarget.style.color=lc.g1; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,0,0,0.09)'; e.currentTarget.style.color='#3C404F'; }}
              onMouseDown={e => e.currentTarget.style.transform='scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform='scale(1)'}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, isLast, lc, grad, primaryColor, onExportMessage }) {
  const isUser = msg.role === 'user';
  const hasBlocks = msg.blocks?.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard?.writeText(msg.content ?? '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      style={{ display:'flex', flexDirection:'column', gap:8,
        alignItems: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
      }}
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.25, ease:[0.23,1,0.32,1] }}>

      {/* AI sender row */}
      {!isUser && (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:24, height:24, borderRadius:8, background:grad,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Sparkles size={12} color="#fff"/>
          </div>
          <span style={{ fontSize:12, fontWeight:600, color:'#3C404F',
            fontFamily:'Bricolage Grotesque, DM Sans, sans-serif' }}>PR Solutions</span>
          <span style={{ fontSize:11, color:'#B0B5C8',
            fontFamily:'DM Sans, system-ui, sans-serif' }}>{formatTime(msg.ts)}</span>
        </div>
      )}

      {/* User bubble */}
      {isUser && (
        <div style={{
          background:grad, color:'#fff',
          padding:'11px 17px', borderRadius:'16px 16px 4px 16px',
          maxWidth:'72%', fontSize:14, lineHeight:1.6,
          fontFamily:'DM Sans, system-ui, sans-serif',
          boxShadow:`0 4px 16px ${lc.g1}30`,
        }}>
          {msg.content}
        </div>
      )}

      {/* AI response — text + blocks */}
      {!isUser && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:'100%', width:'100%' }}>
          {/* Lead text */}
          {msg.content && (
            <div style={{
              background:'#fff', border:'1px solid rgba(0,0,0,0.08)',
              borderRadius:14, padding:'13px 17px',
              fontSize:14, color:'#3C404F', lineHeight:1.65,
              fontFamily:'DM Sans, system-ui, sans-serif',
              boxShadow:'0 1px 6px rgba(0,0,0,0.05)',
            }}>
              <MarkdownText text={msg.content}/>
              {msg.changesApplied > 0 && (
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:5, marginTop:8,
                  fontSize:11.5, fontWeight:600, color:primaryColor,
                  background:`${primaryColor}12`, padding:'3px 9px', borderRadius:50,
                }}>
                  ✓ {msg.changesApplied} dashboard change{msg.changesApplied > 1 ? 's' : ''} applied
                </span>
              )}
            </div>
          )}

          {/* Generative UI blocks */}
          {hasBlocks && (
            <GenerativeUIRenderer blocks={msg.blocks} primaryColor={primaryColor} />
          )}

          {/* Message action bar */}
          {!isUser && (msg.content || hasBlocks) && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={copyText}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px',
                  borderRadius:6, border:'1px solid rgba(0,0,0,0.08)', background:'#fff',
                  fontSize:11.5, color:'#737888', cursor:'pointer',
                  fontFamily:'DM Sans, system-ui, sans-serif',
                  transition:'all 0.12s',
                }}>
                {copied ? <Check size={11} style={{ color:'#16A34A' }}/> : <Copy size={11}/>}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={onExportMessage}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 9px',
                  borderRadius:6, border:'1px solid rgba(0,0,0,0.08)', background:'#fff',
                  fontSize:11.5, color:'#737888', cursor:'pointer',
                  fontFamily:'DM Sans, system-ui, sans-serif',
                  transition:'all 0.12s',
                }}>
                <Download size={11}/>
                Save as HTML
              </button>
            </div>
          )}
        </div>
      )}

      {/* User timestamp */}
      {isUser && (
        <span style={{ fontSize:11, color:'#B0B5C8', fontFamily:'DM Sans, system-ui, sans-serif' }}>
          {formatTime(msg.ts)}
        </span>
      )}
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
}

function MarkdownText({ text }) {
  if (!text) return null;
  const parts = String(text).split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p,i) => i%2===1 ? <strong key={i} style={{ fontWeight:700 }}>{p}</strong> : <React.Fragment key={i}>{p}</React.Fragment>)}</>;
}
