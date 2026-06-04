import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMediaStore } from '../store/mediaStore';
import { DASHBOARDS } from '../constants/dashboards';

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  card: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  },
};

export default function Stage2DashboardSelect() {
  const navigate = useNavigate();
  const storeSetDashboard = useMediaStore((s) => s.setSelectedDashboard);
  const storeSetBrand = useMediaStore((s) => s.setBrandName);
  const storedBrand = useMediaStore((s) => s.brandName);
  const storedDash = useMediaStore((s) => s.selectedDashboard);

  const [selected, setSelected] = useState(storedDash?.id ?? null);
  const [brand, setBrand] = useState(storedBrand ?? '');
  const [brandError, setBrandError] = useState('');

  function handleSelect(dash) {
    setSelected(dash.id);
  }

  function handleContinue() {
    if (!brand.trim()) {
      setBrandError('Please enter a brand name');
      return;
    }
    const dash = DASHBOARDS.find((d) => d.id === selected);
    storeSetDashboard(dash);
    storeSetBrand(brand.trim());
    navigate('/media/review');
  }

  return (
    <div className="mi-stage mi-stage--select">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-header"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">02</span>
          <span>Intelligence Module</span>
        </div>
        <h1 className="mi-stage-title">Select dashboard type</h1>
        <p className="mi-stage-subtitle">
          Choose which intelligence lens to apply to your dataset.
        </p>
      </motion.div>

      {/* ── Brand name input ─────────────────────────────────────── */}
      <motion.div
        className="mi-brand-input-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <label className="mi-label" htmlFor="brand-name">
          Brand / Organisation name
        </label>
        <input
          id="brand-name"
          className={`mi-input ${brandError ? 'mi-input--error' : ''}`}
          type="text"
          placeholder="e.g. AlphaMetricx, Coca-Cola, NHS…"
          value={brand}
          onChange={(e) => { setBrand(e.target.value); setBrandError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          autoFocus
        />
        {brandError && <span className="mi-input-error-msg">{brandError}</span>}
      </motion.div>

      {/* ── Dashboard cards ──────────────────────────────────────── */}
      <motion.div
        className="mi-dashboard-grid"
        variants={stagger.container}
        initial="initial"
        animate="animate"
      >
        {DASHBOARDS.map((dash) => (
          <DashboardCard
            key={dash.id}
            dash={dash}
            isSelected={selected === dash.id}
            onSelect={() => handleSelect(dash)}
          />
        ))}
      </motion.div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/upload')}>
          ← Back
        </button>
        <motion.button
          className="mi-btn mi-btn--primary"
          onClick={handleContinue}
          disabled={!selected}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Enrich Dataset
          <ArrowRightIcon />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── DashboardCard ─────────────────────────────────────────────────────────────
function DashboardCard({ dash, isSelected, onSelect }) {
  return (
    <motion.button
      variants={stagger.card}
      className={`mi-dash-card ${isSelected ? 'mi-dash-card--selected' : ''}`}
      onClick={onSelect}
      style={{
        '--card-tint': dash.tint,
        borderColor: isSelected ? dash.tint : undefined,
        boxShadow: isSelected ? `0 0 0 1px ${dash.tint}, 0 8px 32px ${dash.tint}22` : undefined,
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      aria-pressed={isSelected}
      aria-label={`Select ${dash.name}`}
    >
      {/* Num + selected indicator */}
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
            <CheckIcon />
          </motion.span>
        )}
      </div>

      {/* Name */}
      <h3 className="mi-dash-name">{dash.name}</h3>
      <p className="mi-dash-desc">{dash.description}</p>

      {/* Stat */}
      <div className="mi-dash-stat">
        <span className="mi-dash-stat-value" style={{ color: dash.tint }}>{dash.statV}</span>
        <span className="mi-dash-stat-label">{dash.statL}</span>
        <span className={`mi-dash-delta ${dash.deltaPos ? 'mi-dash-delta--pos' : 'mi-dash-delta--neg'}`}>
          {dash.delta}
        </span>
      </div>

      {/* Mini sparkline */}
      {dash.spark && <MiniSparkline data={dash.spark} color={dash.tint} />}
      {dash.previewChart?.type === 'dummyGauge' && (
        <MiniGauge value={dash.previewChart.value} color={dash.tint} />
      )}

      {/* Tint accent bar */}
      <div className="mi-dash-accent" style={{ background: dash.tint }} />
    </motion.button>
  );
}

function MiniSparkline({ data, color }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 28 - (v / max) * 22;
    return `${x},${y}`;
  });
  return (
    <svg className="mi-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function MiniGauge({ value, color }) {
  const pct = value / 100;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.75 * pct;
  return (
    <svg className="mi-mini-gauge" viewBox="0 0 60 44">
      <circle cx="30" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"
        strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={circ * 0.125}
        strokeLinecap="round" transform="rotate(0 30 38)" />
      <circle cx="30" cy="38" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.125}
        strokeLinecap="round" transform="rotate(0 30 38)" opacity="0.9" />
      <text x="30" y="36" textAnchor="middle" fontSize="10" fill={color} fontWeight="600">{value}</text>
    </svg>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
