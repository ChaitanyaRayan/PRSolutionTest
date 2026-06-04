import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Info, CheckCheck } from 'lucide-react';
import { useMediaStore } from '../store/mediaStore';
import { DASHBOARDS } from '../constants/dashboards';

// Build a map once for the store helper
const DASHBOARDS_MAP = Object.fromEntries(DASHBOARDS.map((d) => [d.id, d]));

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  card: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  },
};

export default function Stage2Configure() {
  const navigate = useNavigate();
  const store = useMediaStore();

  // Seed from store — multi-select
  const [selectedIds, setSelectedIds] = useState(() => store.selectedDashboards?.length > 0 ? store.selectedDashboards : (store.selectedDashboard ? [store.selectedDashboard.id] : []));
  const [brandName,   setBrandName]   = useState(store.brandName);
  const [dashTitle,   setDashTitle]   = useState(store.dashboardTitle);
  const [competitors, setCompetitors] = useState(store.competitors);
  const [compInput,   setCompInput]   = useState('');
  const [msgKw,       setMsgKw]       = useState(store.messageKeywords);
  const [msgInput,    setMsgInput]    = useState('');
  const [skillPrompt, setSkillPrompt] = useState(store.skillPrompt);
  const [errors,      setErrors]      = useState({});

  // Register dashboards map for store
  useEffect(() => { store.registerDashboardsMap(DASHBOARDS_MAP); }, []);

  const isNarrative  = selectedIds.includes('narrative');
  const isMonitoring = selectedIds.includes('monitoring');

  // Toggle a dashboard in/out of the selection
  function toggleDashboard(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    setErrors((e) => ({ ...e, dashboard: undefined }));
  }

  // ── Tag helpers ──────────────────────────────────────────────────────────────
  const addTag = useCallback((raw, list, setter, inputSetter) => {
    const tag = raw.trim().replace(/,+$/, '');
    if (tag && !list.includes(tag)) setter((l) => [...l, tag]);
    inputSetter('');
  }, []);

  const removeTag = useCallback((tag, setter) => {
    setter((l) => l.filter((t) => t !== tag));
  }, []);

  function validate() {
    const errs = {};
    if (!brandName.trim())    errs.brandName = 'Client name is required';
    if (!dashTitle.trim())    errs.dashTitle  = 'Dashboard title is required';
    if (selectedIds.length === 0) errs.dashboard = 'Please select at least one dashboard type';
    if (isMonitoring && !skillPrompt.trim()) errs.skillPrompt = 'Skill prompt is required for Media Monitoring';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    store.setSelectedDashboards(selectedIds);
    // Also set primary single for legacy compat
    store.setSelectedDashboard(DASHBOARDS_MAP[selectedIds[0]] ?? null);
    store.setBrandName(brandName.trim());
    store.setDashboardTitle(dashTitle.trim());
    store.setCompetitors(competitors);
    store.setMessageKeywords(msgKw);
    store.setSkillPrompt(skillPrompt);
    navigate('/media/launch');
  }

  return (
    <div className="mi-stage mi-stage--configure">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-header" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">02</span>
          <span>Intelligence Configuration</span>
        </div>
        <h1 className="mi-stage-title">Configure your dashboards</h1>
        <p className="mi-stage-subtitle">
          Select one or multiple intelligence lenses — you can combine Media Measurement, Monitoring, Narrative, PR Impact and Reputation into a single workspace.
        </p>
      </motion.div>

      {/* ── Two-column form ──────────────────────────────────────── */}
      <div className="mi-configure-layout">

        {/* LEFT — Multi-select dashboard grid ────────────────────── */}
        <div className="mi-configure-col mi-configure-col--left">
          <div className="mi-field-block">
            <div className="mi-field-row">
              <label className="mi-label">Intelligence modules</label>
              {selectedIds.length > 0 && (
                <span className="mi-selection-count">
                  <CheckCheck size={12} />
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            {errors.dashboard && <span className="mi-input-error-msg">{errors.dashboard}</span>}
            <p className="mi-field-hint">Click to toggle — select as many as you need</p>
          </div>

          <motion.div
            className="mi-dashboard-grid mi-dashboard-grid--compact"
            variants={stagger.container}
            initial="initial"
            animate="animate"
          >
            {DASHBOARDS.map((dash) => (
              <DashCard
                key={dash.id}
                dash={dash}
                isSelected={selectedIds.includes(dash.id)}
                selectionOrder={selectedIds.indexOf(dash.id) + 1}
                onToggle={() => toggleDashboard(dash.id)}
              />
            ))}
          </motion.div>

          {/* Selected summary chips */}
          <AnimatePresence>
            {selectedIds.length > 1 && (
              <motion.div
                className="mi-selected-summary"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <span className="mi-selected-summary-label">Dashboard workspace:</span>
                <div className="mi-selected-chips">
                  {selectedIds.map((id) => {
                    const d = DASHBOARDS_MAP[id];
                    return (
                      <span key={id} className="mi-selected-chip" style={{ borderColor: d?.tint, color: d?.tint }}>
                        {d?.name}
                        <button className="mi-chip-remove" onClick={() => toggleDashboard(id)}>
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <p className="mi-multi-hint">
                  A Dashboard Workspace will be created with {selectedIds.length} dashboards accessible from a unified homepage.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT — Text fields ────────────────────────────────────── */}
        <div className="mi-configure-col mi-configure-col--right">

          {/* Client name */}
          <div className="mi-field-block">
            <label className="mi-label" htmlFor="client-name">
              Client / Brand name <span className="mi-label-required">*</span>
            </label>
            <input
              id="client-name"
              className={`mi-input ${errors.brandName ? 'mi-input--error' : ''}`}
              value={brandName}
              onChange={(e) => { setBrandName(e.target.value); setErrors((x) => ({ ...x, brandName: undefined })); }}
              placeholder="e.g. AARP"
            />
            {errors.brandName && <span className="mi-input-error-msg">{errors.brandName}</span>}
          </div>

          {/* Dashboard title */}
          <div className="mi-field-block">
            <label className="mi-label" htmlFor="dash-title">
              Dashboard / Workspace title <span className="mi-label-required">*</span>
            </label>
            <input
              id="dash-title"
              className={`mi-input ${errors.dashTitle ? 'mi-input--error' : ''}`}
              value={dashTitle}
              onChange={(e) => { setDashTitle(e.target.value); setErrors((x) => ({ ...x, dashTitle: undefined })); }}
              placeholder="e.g. AARP Media Intelligence Dashboard"
            />
            {errors.dashTitle && <span className="mi-input-error-msg">{errors.dashTitle}</span>}
          </div>

          {/* Competitors (optional) */}
          <div className="mi-field-block">
            <label className="mi-label">
              Competitors
              <span className="mi-label-hint">Optional — monitored alongside the brand</span>
            </label>
            <TagInput
              tags={competitors}
              input={compInput}
              onInputChange={setCompInput}
              onAdd={() => addTag(compInput, competitors, setCompetitors, setCompInput)}
              onRemove={(t) => removeTag(t, setCompetitors)}
              placeholder="Type competitor name, press Enter…"
            />
          </div>

          {/* Message keywords — NARRATIVE ONLY */}
          <AnimatePresence>
            {isNarrative && (
              <motion.div
                className="mi-field-block mi-field-block--conditional"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25 }}
              >
                <label className="mi-label">
                  Message keywords
                  <span className="mi-label-conditional"><Info size={11} /> Narrative Intelligence</span>
                </label>
                <TagInput
                  tags={msgKw}
                  input={msgInput}
                  onInputChange={setMsgInput}
                  onAdd={() => addTag(msgInput, msgKw, setMsgKw, setMsgInput)}
                  onRemove={(t) => removeTag(t, setMsgKw)}
                  placeholder="e.g. senior care, retirement…"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skill prompt — MEDIA MONITORING ONLY */}
          <AnimatePresence>
            {isMonitoring && (
              <motion.div
                className="mi-field-block mi-field-block--conditional"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.25 }}
              >
                <label className="mi-label" htmlFor="skill-prompt">
                  Skill prompt <span className="mi-label-required">*</span>
                  <span className="mi-label-conditional"><Info size={11} /> Media Monitoring</span>
                </label>
                <textarea
                  id="skill-prompt"
                  className={`mi-textarea ${errors.skillPrompt ? 'mi-input--error' : ''}`}
                  value={skillPrompt}
                  onChange={(e) => { setSkillPrompt(e.target.value); setErrors((x) => ({ ...x, skillPrompt: undefined })); }}
                  rows={4}
                  placeholder={'New & Noteworthy News\nInclude:\nTop Tier or competitor news that are of critical importance to the client.'}
                />
                {errors.skillPrompt && <span className="mi-input-error-msg">{errors.skillPrompt}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/upload')}>← Back</button>
        <motion.button
          className="mi-btn mi-btn--primary"
          onClick={handleContinue}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Review & Launch Pipeline
          <ArrowRightIcon />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── TagInput ──────────────────────────────────────────────────────────────────
function TagInput({ tags, input, onInputChange, onAdd, onRemove, placeholder }) {
  return (
    <div className="mi-tag-input">
      {tags.map((tag) => (
        <span key={tag} className="mi-tag">
          {tag}
          <button type="button" className="mi-tag-remove" onClick={() => onRemove(tag)}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        className="mi-tag-input-field"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); onAdd(); }
          if (e.key === 'Backspace' && !input && tags.length > 0) onRemove(tags[tags.length - 1]);
        }}
        onBlur={() => input.trim() && onAdd()}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  );
}

// ── DashCard — Multi-select variant ──────────────────────────────────────────
function DashCard({ dash, isSelected, selectionOrder, onToggle }) {
  return (
    <motion.button
      variants={stagger.card}
      className={`mi-dash-card mi-dash-card--sm ${isSelected ? 'mi-dash-card--selected' : ''}`}
      onClick={onToggle}
      style={{
        borderColor: isSelected ? dash.tint : undefined,
        boxShadow: isSelected ? `0 0 0 1.5px ${dash.tint}, 0 4px 20px ${dash.tint}22` : undefined,
        background: isSelected ? `${dash.tint}08` : undefined,
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      aria-pressed={isSelected}
    >
      <div className="mi-dash-card-top">
        <span className="mi-dash-num" style={{ color: dash.tint }}>{dash.num}</span>
        {isSelected && (
          <motion.span
            className="mi-dash-check"
            style={{ background: dash.tint }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            {selectionOrder > 0 ? selectionOrder : <CheckIcon />}
          </motion.span>
        )}
      </div>
      <h3 className="mi-dash-name">{dash.name}</h3>
      <div className="mi-dash-accent" style={{ background: isSelected ? dash.tint : `${dash.tint}55` }} />
    </motion.button>
  );
}

function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ArrowRightIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
