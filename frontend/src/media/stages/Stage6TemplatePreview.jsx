/**
 * Stage6TemplatePreview — Split Preview Screen
 *
 * Left:  Full iframe preview of the selected HTML template
 * Right: Live API content snapshot (articles, sentiment, narratives, metrics)
 *
 * User validates the pairing before generating the dashboard.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles, BarChart2, FileText, Activity, Layers,
  ChevronRight, RefreshCw, Loader2
} from 'lucide-react';
import { useMediaStore } from '../store/mediaStore';
import { chartsApi } from '../api/client';

export default function Stage6TemplatePreview() {
  const navigate       = useNavigate();
  const [qp]           = useSearchParams();
  const store          = useMediaStore();

  const template   = store.selectedTemplate;
  // Support both store state and URL query params (coming from Stage4Review)
  const workflowId = qp.get('workflow_id') ?? store.workflowId;
  const lensId     = qp.get('lens')        ?? store.lensId;
  const brandName  = store.brandName;
  const confirmedData = store.confirmedData ?? [];

  const [apiContent,      setApiContent]      = useState(null);
  const [contentLoading,  setContentLoading]  = useState(false);
  const [contentError,    setContentError]    = useState(null);
  const [generating,      setGenerating]      = useState(false);

  // Fetch real charts data from the backend
  useEffect(() => { if (workflowId && lensId) loadContent(); }, [workflowId, lensId]);

  async function loadContent() {
    setContentLoading(true);
    setContentError(null);
    try {
      // Use the real chartsApi endpoint
      const data = await chartsApi.get(workflowId, lensId);
      setApiContent(data);
    } catch (err) {
      setContentError(err.message);
      // Graceful fallback — show confirmed article titles
      if (confirmedData.length > 0) {
        setApiContent({ articles: confirmedData.slice(0, 6) });
      }
    } finally {
      setContentLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    // Small delay for UX — save template to store and navigate
    await new Promise((r) => setTimeout(r, 600));
    navigate('/media/dashboard');
    setGenerating(false);
  }

  if (!template) {
    return (
      <div className="mi-stage">
        <p style={{ color: 'var(--mi-text-2)' }}>
          No template selected.{' '}
          <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={() => navigate('/media/template-select')}>
            Select a template
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mi-stage mi-stage--tpl-preview" style={{ '--tpl-primary': template.primaryColor }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-header" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge" style={{ background: template.primaryColor }}>06</span>
          <span>Template + Data Preview</span>
        </div>
        <h1 className="mi-stage-title">Validate template &amp; data pairing</h1>
        <p className="mi-stage-subtitle">
          Confirm the <strong>{template.name}</strong> template suits your <strong>{brandName}</strong> data before generating the dashboard.
        </p>
      </motion.div>

      {/* ── Split pane ───────────────────────────────────────────── */}
      <div className="mi-tpl-preview-split">

        {/* LEFT — Template iframe ──────────────────────────────── */}
        <motion.div
          className="mi-tpl-preview-left"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mi-tpl-preview-pane-header">
            <span className="mi-tpl-preview-pane-label">
              <Layers size={13} />
              Template Preview
            </span>
            <span className="mi-tpl-preview-pane-meta" style={{ color: template.primaryColor }}>
              {template.name} · {template.style}
            </span>
          </div>
          <div className="mi-tpl-preview-iframe-wrap">
            <iframe
              src={template.file}
              title={template.name}
              className="mi-tpl-preview-iframe"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
          {/* Palette strip */}
          <div className="mi-tpl-palette-strip">
            {template.palette.map((c) => (
              <span key={c} title={c} style={{ background: c, flex: 1, height: 5 }} />
            ))}
          </div>
          <div className="mi-tpl-preview-meta-row">
            {template.tags.map((t) => (
              <span key={t} className="mi-tpl-tag" style={{ borderColor: `${template.primaryColor}55`, color: template.primaryColor }}>{t}</span>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — API Content snapshot ────────────────────────── */}
        <motion.div
          className="mi-tpl-preview-right"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          <div className="mi-tpl-preview-pane-header">
            <span className="mi-tpl-preview-pane-label">
              <Activity size={13} />
              API Content Preview
            </span>
            {!contentLoading && (
              <button className="mi-btn-icon mi-btn-icon--sm" onClick={loadContent} title="Refresh">
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          <div className="mi-tpl-content-panel">
            {contentLoading && (
              <div className="mi-tpl-content-loading">
                <Loader2 size={20} className="mi-spin" style={{ color: template.primaryColor }} />
                <p>Fetching data snapshot…</p>
              </div>
            )}

            {!contentLoading && (
              <>
                {/* Show actual keys from chartsApi response */}
                <ChartApiSummary
                  apiContent={apiContent}
                  confirmedData={confirmedData}
                  color={template.primaryColor}
                />

                {/* Storyboard preview */}
                <div className="mi-tpl-storyboard-preview">
                  <h4 className="mi-tpl-preview-section-title">
                    <Layers size={13} />
                    Storyboard Cards
                  </h4>
                  <div className="mi-tpl-storyboard-cards">
                    {['Brand Positioning', 'Competitor Landscape', 'Audience Insights'].map((s, i) => (
                      <div key={i} className="mi-tpl-story-chip" style={{ borderColor: `${template.primaryColor}44` }}>
                        <span className="mi-tpl-story-dot" style={{ background: template.primaryColor }} />
                        {s}
                      </div>
                    ))}
                    <div className="mi-tpl-story-chip mi-tpl-story-chip--more">+ AI-generated…</div>
                  </div>
                </div>

                {/* Compatibility note */}
                <div className="mi-tpl-compat-note" style={{ borderColor: `${template.primaryColor}33`, background: `${template.primaryColor}08` }}>
                  <Sparkles size={13} style={{ color: template.primaryColor, flexShrink: 0 }} />
                  <p>
                    AI will intelligently map your <strong>{brandName}</strong> data into the{' '}
                    <strong style={{ color: template.primaryColor }}>{template.name}</strong> template structure.
                    All colours, typography, and layouts will be inherited from the selected template.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/template-select')}>
          ← Change Template
        </button>
        <motion.button
          className="mi-btn mi-btn--primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ background: template.primaryColor, borderColor: template.primaryColor }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {generating
            ? <><Loader2 size={14} className="mi-spin" /> Generating…</>
            : <><Sparkles size={14} /> Generate Dashboard <ChevronRight size={14} /></>
          }
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── ChartApiSummary — shows real data from chartsApi ────────────────────────
function ChartApiSummary({ apiContent, confirmedData, color }) {
  if (!apiContent) {
    // No data yet — show fallback from confirmed articles
    const titles = confirmedData.slice(0, 5).map((a) => a.title ?? a.headline ?? 'Article');
    return (
      <div className="mi-tpl-content-section">
        <h4 className="mi-tpl-preview-section-title" style={{ color }}>
          <FileText size={14} /> Articles (Review Stage)
        </h4>
        {titles.length > 0 ? (
          <ul className="mi-tpl-content-list">
            {titles.map((t, i) => (
              <li key={i} className="mi-tpl-content-item">
                <span className="mi-tpl-item-dot" style={{ background: color }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mi-tpl-content-empty">No article data available</p>
        )}
      </div>
    );
  }

  // Normalise the chartsApi response into sections
  const sections = buildPreviewSections(apiContent);

  return (
    <>
      {sections.map((section, si) => (
        <div key={si} className="mi-tpl-content-section">
          <h4 className="mi-tpl-preview-section-title" style={{ color }}>
            {section.icon}
            {section.title}
            <span className="mi-tpl-content-count">{section.items.length} items</span>
          </h4>
          <ul className="mi-tpl-content-list">
            {section.items.slice(0, 5).map((item, i) => (
              <li key={i} className="mi-tpl-content-item">
                <span className="mi-tpl-item-dot" style={{ background: color }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** Turn raw chartsApi response into preview sections */
function buildPreviewSections(raw) {
  const sections = [];
  if (!raw) return sections;

  const fmt = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Handle array of chart objects
  const chartArray = Array.isArray(raw) ? raw : (Array.isArray(raw.charts) ? raw.charts : null);
  if (chartArray) {
    chartArray.forEach((chart) => {
      const data = chart.data;
      const items = [];
      if (Array.isArray(data)) {
        data.slice(0, 8).forEach((row) => {
          if (typeof row === 'object') {
            const name = row.name ?? row.label ?? row.category ?? '';
            const val  = row.value ?? row.count ?? '';
            items.push(val !== '' ? `${name}: ${val}` : name);
          } else {
            items.push(String(row));
          }
        });
      } else if (typeof data === 'number' || typeof data === 'string') {
        items.push(String(data));
      }
      sections.push({ title: chart.title ?? fmt(chart.label ?? ''), icon: <BarChart2 size={13} />, items });
    });
    return sections;
  }

  // Handle keyed map { sentiment_score: {...}, top_themes: {...} }
  Object.entries(raw).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const data = value.data ?? value;
    const items = [];
    if (Array.isArray(data)) {
      data.slice(0, 8).forEach((row) => {
        if (typeof row === 'object') {
          const name = row.name ?? row.label ?? '';
          const val  = row.value ?? row.count ?? '';
          items.push(val !== '' ? `${name}: ${val}` : name);
        } else {
          items.push(String(row));
        }
      });
    } else if (typeof data === 'number') {
      items.push(String(data));
    }
    sections.push({ title: value.title ?? fmt(key), icon: <BarChart2 size={13} />, items });
  });

  return sections;
}

// ── ContentSection (generic fallback) ────────────────────────────────────────
function ContentSection({ icon, title, color, items, emptyMsg }) {
  const hasItems = items && items.length > 0;
  return (
    <div className="mi-tpl-content-section">
      <h4 className="mi-tpl-preview-section-title" style={{ color }}>
        {icon}
        {title}
      </h4>
      {hasItems ? (
        <ul className="mi-tpl-content-list">
          {items.map((item, i) => (
            <li key={i} className="mi-tpl-content-item">
              <span className="mi-tpl-item-dot" style={{ background: color }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mi-tpl-content-empty">{emptyMsg}</p>
      )}
    </div>
  );
}
