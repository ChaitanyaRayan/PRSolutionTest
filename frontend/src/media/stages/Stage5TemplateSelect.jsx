/**
 * Stage5TemplateSelect — HTML Template Gallery
 *
 * Shows all 11 brand HTML templates as iframe previews.
 * User selects exactly one template, then proceeds to preview.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ExternalLink, Layers } from 'lucide-react';
import { useMediaStore } from '../store/mediaStore';
import { HTML_TEMPLATES } from '../constants/templates';

const GRID_STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  },
};

export default function Stage5TemplateSelect() {
  const navigate = useNavigate();
  const store = useMediaStore();
  const [selectedId, setSelectedId] = useState(store.selectedTemplateId ?? null);
  const [hoveredId,  setHoveredId]  = useState(null);
  const [error,      setError]      = useState(null);

  function handleSelect(tpl) {
    setSelectedId(tpl.id);
    setError(null);
  }

  function handleContinue() {
    if (!selectedId) { setError('Please select a template to continue.'); return; }
    const tpl = HTML_TEMPLATES.find((t) => t.id === selectedId);
    store.setSelectedTemplate(tpl);
    navigate('/media/template-preview');
  }

  const selectedTpl = HTML_TEMPLATES.find((t) => t.id === selectedId);

  return (
    <div className="mi-stage mi-stage--template-select">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-header" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">05</span>
          <span>Template Gallery</span>
        </div>
        <h1 className="mi-stage-title">Choose your dashboard template</h1>
        <p className="mi-stage-subtitle">
          The selected template becomes the complete visual identity of your dashboard — colours, typography, layout, and chart styles are all driven by your choice.
        </p>
      </motion.div>

      {/* ── Selected banner ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTpl && (
          <motion.div
            className="mi-tpl-selected-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ borderColor: selectedTpl.primaryColor, background: `${selectedTpl.primaryColor}10` }}
          >
            <div className="mi-tpl-banner-swatch" style={{ background: selectedTpl.primaryColor }} />
            <div>
              <span className="mi-tpl-banner-name">{selectedTpl.name}</span>
              <span className="mi-tpl-banner-style"> — {selectedTpl.style}</span>
            </div>
            <div className="mi-tpl-banner-palette">
              {selectedTpl.palette.slice(0, 4).map((c) => (
                <span key={c} className="mi-tpl-palette-dot" style={{ background: c }} />
              ))}
            </div>
            <span className="mi-tpl-banner-check" style={{ background: selectedTpl.primaryColor }}>
              <Check size={12} color="#fff" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mi-input-error-msg" style={{ marginBottom: 12 }}>{error}</p>}

      {/* ── Template grid ────────────────────────────────────────── */}
      <motion.div
        className="mi-tpl-grid"
        variants={GRID_STAGGER.container}
        initial="initial"
        animate="animate"
      >
        {HTML_TEMPLATES.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            isSelected={selectedId === tpl.id}
            isHovered={hoveredId === tpl.id}
            onSelect={() => handleSelect(tpl)}
            onHover={setHoveredId}
          />
        ))}
      </motion.div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/review')}>← Back to Review</button>
        <motion.button
          className="mi-btn mi-btn--primary"
          onClick={handleContinue}
          disabled={!selectedId}
          whileHover={selectedId ? { scale: 1.02 } : {}}
          whileTap={selectedId ? { scale: 0.98 } : {}}
        >
          <Layers size={14} />
          Preview Template + Data
          <ArrowRightIcon />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── TemplateCard ──────────────────────────────────────────────────────────────
function TemplateCard({ tpl, isSelected, isHovered, onSelect, onHover }) {
  const iframeRef = useRef(null);

  return (
    <motion.div
      variants={GRID_STAGGER.item}
      className={`mi-tpl-card ${isSelected ? 'mi-tpl-card--selected' : ''}`}
      style={{
        borderColor: isSelected ? tpl.primaryColor : undefined,
        boxShadow: isSelected
          ? `0 0 0 2px ${tpl.primaryColor}, 0 8px 32px ${tpl.primaryColor}22`
          : undefined,
      }}
      onClick={onSelect}
      onMouseEnter={() => onHover(tpl.id)}
      onMouseLeave={() => onHover(null)}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Iframe thumbnail */}
      <div className="mi-tpl-thumb">
        <iframe
          ref={iframeRef}
          src={tpl.file}
          title={tpl.name}
          className="mi-tpl-iframe"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          scrolling="no"
        />
        {/* Overlay to prevent iframe interaction while selecting */}
        <div className="mi-tpl-iframe-overlay" />

        {/* Selected checkmark */}
        {isSelected && (
          <motion.div
            className="mi-tpl-check-badge"
            style={{ background: tpl.primaryColor }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <Check size={14} color="#fff" strokeWidth={2.5} />
          </motion.div>
        )}
      </div>

      {/* Card info */}
      <div className="mi-tpl-info">
        <div className="mi-tpl-info-top">
          <div>
            <h3 className="mi-tpl-name">{tpl.name}</h3>
            <p className="mi-tpl-style">{tpl.style}</p>
          </div>
          <div className="mi-tpl-palette-row">
            {tpl.palette.slice(0, 3).map((c) => (
              <span key={c} className="mi-tpl-palette-swatch" style={{ background: c }} />
            ))}
          </div>
        </div>
        <p className="mi-tpl-desc">{tpl.description}</p>
        <div className="mi-tpl-tags">
          {tpl.tags.map((tag) => (
            <span key={tag} className="mi-tpl-tag" style={{ borderColor: `${tpl.primaryColor}55`, color: tpl.primaryColor }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ArrowRightIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
