/**
 * DashboardHomepage — Multi-Dashboard Workspace
 *
 * When multiple dashboards are selected, this is shown instead of jumping
 * directly into a single dashboard. Each card represents one intelligence lens.
 * Clicking a card opens that specific dashboard.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Eye, Layers, Zap, Star,
  ArrowRight, Clock, TrendingUp, TrendingDown
} from 'lucide-react';
import { useMediaStore } from '../store/mediaStore';
import { DASHBOARDS } from '../constants/dashboards';

const DASHBOARD_META = {
  intelligence: {
    icon: Eye,
    heroImg: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    description: 'Track total article volume, source distribution, and coverage velocity across all media channels.',
    keyMetric: 'Total Articles',
    trend: '+12.3%',
    trendUp: true,
  },
  monitoring: {
    icon: BarChart2,
    heroImg: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    description: 'Monitor brand mentions, sentiment shifts, and emerging media narratives in real-time.',
    keyMetric: 'Impact Index',
    trend: '+4.1 pts',
    trendUp: true,
  },
  narrative: {
    icon: Layers,
    heroImg: 'https://images.unsplash.com/photo-1553484771-047a44eee27a?w=600&q=80',
    description: 'Identify active narratives, track their lifecycle, and understand thematic clustering.',
    keyMetric: 'Active Narratives',
    trend: '+3 new',
    trendUp: true,
  },
  pr: {
    icon: Zap,
    heroImg: 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600&q=80',
    description: 'Measure earned media value, PR campaign ROI, and spokesperson effectiveness.',
    keyMetric: 'EMV This Month',
    trend: '−2.1%',
    trendUp: false,
  },
  reputation: {
    icon: Star,
    heroImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    description: 'Score and track brand reputation across dimensions including trust, quality, and advocacy.',
    keyMetric: 'Reputation Score',
    trend: '+1.2',
    trendUp: true,
  },
};

const CARD_STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.08 } } },
  card: {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  },
};

export default function DashboardHomepage({ workflowId, lensId, brandName, template }) {
  const navigate = useNavigate();
  const store = useMediaStore();
  const selectedIds = store.selectedDashboards ?? [];
  const dashboards  = DASHBOARDS.filter((d) => selectedIds.includes(d.id));
  const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  function openDashboard(dashId) {
    // Navigate to the engine with the specific dashboard lens
    navigate(`/media/dashboard/lens/${dashId}?workflow_id=${workflowId}&lens=${lensId}&dash=${dashId}`);
  }

  const tplPrimary = template?.primaryColor ?? '#7C3AED';
  const tplBg     = template?.bgColor ?? '#f8f9fa';

  return (
    <div className="dash-home" style={{ '--dash-primary': tplPrimary, '--dash-bg': tplBg, background: tplBg }}>

      {/* ── Workspace Header ─────────────────────────────────────── */}
      <motion.div
        className="dash-home-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="dash-home-brand">
          <div className="dash-home-brand-dot" style={{ background: tplPrimary }} />
          <div>
            <h1 className="dash-home-brand-name">{brandName}</h1>
            <p className="dash-home-brand-sub">Dashboard Workspace · {selectedIds.length} active lenses</p>
          </div>
        </div>
        <div className="dash-home-meta">
          <span className="dash-home-date">
            <Clock size={12} />
            Updated {now}
          </span>
          {template && (
            <span className="dash-home-tpl-badge" style={{ borderColor: `${tplPrimary}44`, color: tplPrimary }}>
              {template.name}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="dash-home-divider" style={{ background: `${tplPrimary}22` }} />

      {/* ── Dashboard Cards ──────────────────────────────────────── */}
      <motion.div
        className="dash-home-grid"
        variants={CARD_STAGGER.container}
        initial="initial"
        animate="animate"
      >
        {dashboards.map((dash) => {
          const meta = DASHBOARD_META[dash.id] ?? {};
          const Icon = meta.icon ?? BarChart2;
          return (
            <DashCard
              key={dash.id}
              dash={dash}
              meta={meta}
              Icon={Icon}
              tplPrimary={tplPrimary}
              now={now}
              onOpen={() => openDashboard(dash.id)}
            />
          );
        })}
      </motion.div>
    </div>
  );
}

// ── DashCard ──────────────────────────────────────────────────────────────────
function DashCard({ dash, meta, Icon, tplPrimary, now, onOpen }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={CARD_STAGGER.card}
      className="dash-home-card"
      style={{
        '--card-tint': dash.tint,
        '--card-primary': tplPrimary,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Hero image */}
      <div className="dash-home-card-hero">
        <img
          src={meta.heroImg}
          alt={dash.name}
          className="dash-home-card-img"
          loading="lazy"
        />
        {/* Colour overlay from template */}
        <div
          className="dash-home-card-overlay"
          style={{ background: `linear-gradient(160deg, ${dash.tint}cc 0%, ${tplPrimary}88 100%)` }}
        />
        {/* Badge */}
        <div className="dash-home-card-num">{dash.num}</div>
        {/* Icon */}
        <div className="dash-home-card-icon">
          <Icon size={22} color="#fff" strokeWidth={1.5} />
        </div>
      </div>

      {/* Card body */}
      <div className="dash-home-card-body">
        <div className="dash-home-card-top">
          <h3 className="dash-home-card-title">{dash.name}</h3>
          <div className={`dash-home-card-trend ${meta.trendUp ? 'dash-home-card-trend--up' : 'dash-home-card-trend--down'}`}>
            {meta.trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {meta.trend}
          </div>
        </div>

        <p className="dash-home-card-desc">{meta.description}</p>

        <div className="dash-home-card-kpi">
          <span className="dash-home-card-kpi-label">{meta.keyMetric}</span>
          <div className="dash-home-card-kpi-bar">
            <div
              className="dash-home-card-kpi-fill"
              style={{ background: `linear-gradient(90deg, ${dash.tint}, ${tplPrimary})`, width: '68%' }}
            />
          </div>
        </div>

        <div className="dash-home-card-footer">
          <span className="dash-home-card-updated">
            <Clock size={10} />
            Updated {now}
          </span>
          <button
            className="dash-home-card-btn"
            onClick={onOpen}
            style={{ background: dash.tint, borderColor: dash.tint }}
          >
            Open
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
