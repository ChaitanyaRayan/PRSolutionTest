import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMediaStore } from '../store/mediaStore';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ErrorBanner } from '../components/ErrorBanner';

const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

async function fetchTemplateWithRetry(payload, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch('/api/media/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.template;
    } catch (err) {
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]));
      } else {
        throw err;
      }
    }
  }
}

export default function Stage4Template() {
  const navigate = useNavigate();
  const brandName = useMediaStore((s) => s.brandName);
  const selectedDashboard = useMediaStore((s) => s.selectedDashboard);
  const confirmedData = useMediaStore((s) => s.confirmedData);
  const brandTemplate = useMediaStore((s) => s.brandTemplate);
  const templateLoading = useMediaStore((s) => s.templateLoading);
  const templateError = useMediaStore((s) => s.templateError);
  const setBrandTemplate = useMediaStore((s) => s.setBrandTemplate);
  const setTemplateLoading = useMediaStore((s) => s.setTemplateLoading);
  const setTemplateError = useMediaStore((s) => s.setTemplateError);

  useEffect(() => {
    if (!brandTemplate) {
      generateTemplate();
    }
  }, []);

  async function generateTemplate() {
    setTemplateLoading(true);
    try {
      const sampleTitles = (confirmedData ?? []).slice(0, 10).map((a) => a.title).filter(Boolean);
      const sampleSentiments = (confirmedData ?? []).slice(0, 10).map((a) => a.sentiment).filter(Boolean);
      const template = await fetchTemplateWithRetry({
        brandName,
        dashboardId: selectedDashboard?.id,
        sampleTitles,
        sampleSentiments,
      });
      setBrandTemplate(template);
    } catch (err) {
      setTemplateError(err.message);
    }
  }

  function handleContinue() {
    navigate(`/media/dashboard/${selectedDashboard?.id}/${selectedDashboard?.tabs?.[0]?.id ?? 'overview'}`);
  }

  return (
    <div className="mi-stage mi-stage--template">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">04</span>
          <span>AI Branding Engine</span>
        </div>
        <h1 className="mi-stage-title">Generating your brand template</h1>
        <p className="mi-stage-subtitle">
          Claude is analysing <strong>{brandName}</strong>'s content to create a bespoke visual language for the{' '}
          <strong>{selectedDashboard?.name}</strong> dashboard.
        </p>
      </motion.div>

      <ErrorBanner message={templateError} onRetry={generateTemplate} />

      <AnimatePresence mode="wait">
        {templateLoading && (
          <motion.div
            key="loading"
            className="mi-template-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GeneratingAnimation />
            <div className="mi-template-skeleton-grid">
              <SkeletonLoader variant="card" count={3} />
              <SkeletonLoader variant="chart" count={1} />
            </div>
          </motion.div>
        )}

        {!templateLoading && brandTemplate && (
          <motion.div
            key="result"
            className="mi-template-result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <TemplatePreview template={brandTemplate} brandName={brandName} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/review')}>
          ← Back
        </button>
        {brandTemplate && !templateLoading && (
          <motion.button
            className="mi-btn mi-btn--primary"
            onClick={handleContinue}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Open Dashboard
            <DashboardIcon />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}

// ── TemplatePreview ───────────────────────────────────────────────────────────
function TemplatePreview({ template, brandName }) {
  return (
    <div className="mi-template-preview">
      <div className="mi-template-preview-header">
        <h2 className="mi-template-brand-name">{brandName}</h2>
        <span className="mi-template-badge">Brand theme generated</span>
      </div>

      {/* Colour palette */}
      <div className="mi-template-section">
        <h4 className="mi-template-section-title">Colour Palette</h4>
        <div className="mi-palette-row">
          {[template.primaryColor, template.secondaryColor, template.accentColor, ...(template.chartPalette || [])].map(
            (color, i) => (
              <div key={i} className="mi-palette-swatch" style={{ background: color }} title={color}>
                <span className="mi-palette-swatch-label">{color}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Typography */}
      <div className="mi-template-section">
        <h4 className="mi-template-section-title">Typography</h4>
        <div className="mi-font-pair">
          <div className="mi-font-item">
            <span className="mi-font-role">Heading</span>
            <span className="mi-font-name" style={{ fontFamily: `'${template.fontPair?.heading}', serif` }}>
              {template.fontPair?.heading}
            </span>
          </div>
          <div className="mi-font-item">
            <span className="mi-font-role">Body</span>
            <span className="mi-font-name" style={{ fontFamily: `'${template.fontPair?.body}', sans-serif` }}>
              {template.fontPair?.body}
            </span>
          </div>
        </div>
      </div>

      {/* Layout + tabs */}
      <div className="mi-template-section">
        <h4 className="mi-template-section-title">Dashboard Tabs</h4>
        <div className="mi-template-tabs">
          {(template.tabs || []).map((tab) => (
            <span key={tab.id} className="mi-template-tab-chip" style={{ borderColor: template.primaryColor }}>
              {tab.label}
              <span className="mi-tab-charts">{tab.chartTypes?.join(', ')}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Narrative */}
      {template.storyboardNarrative && (
        <div className="mi-template-section">
          <h4 className="mi-template-section-title">Brand Narrative</h4>
          <p className="mi-template-narrative">{template.storyboardNarrative}</p>
        </div>
      )}
    </div>
  );
}

// ── Generating animation ──────────────────────────────────────────────────────
function GeneratingAnimation() {
  return (
    <div className="mi-generating">
      <div className="mi-generating-orbs">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="mi-generating-orb"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.4, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </div>
      <p className="mi-generating-label">Crafting brand identity…</p>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
