/**
 * WorkflowDetailPage — Dashboard selection screen for a saved workflow.
 * Route: /workflows/:workflowId
 *
 * Fetches the workflow, then renders dashboard cards for each dashboardType.
 * Clicking a card navigates to the existing DashboardEngine via /media/dashboard/lens/:dashId.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, BarChart2, Eye, Layers, Zap, Star, ArrowRight,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { projectsApi }    from '../api/client';
import { DASHBOARDS }     from '../constants/dashboards';
import { HTML_TEMPLATES } from '../constants/templates';

// ── Dashboard metadata (icons, hero images, descriptions) ────────────────────

const DASH_META = {
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

const LENS_ID_MAP = {
  intelligence: 1,
  monitoring:   2,
  narrative:    3,
  pr:           4,
  reputation:   5,
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── WorkflowDetailPage ────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    projectsApi.get(workflowId)
      .then(setWorkflow)
      .catch((e) => setError(e.message))
      .finally(()  => setLoading(false));
  }, [workflowId]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="wf-detail-center">
        <div className="mi-spin" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !workflow) {
    return (
      <div className="wf-detail-center">
        <p style={{ color: 'var(--mi-text-2)', marginBottom: 16 }}>
          {error ? `Failed to load workflow: ${error}` : 'Workflow not found.'}
        </p>
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/workflows')}>
          <ArrowLeft size={14} /> Back to Workflows
        </button>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const template   = HTML_TEMPLATES.find((t) => t.id === workflow.templateId);
  const tplPrimary = template?.primaryColor ?? '#7C3AED';
  const tplBg      = template?.bgColor      ?? '#f8f9fa';
  const dashTypes  = workflow.dashboardTypes ?? [];
  const dashboards = DASHBOARDS.filter((d) => dashTypes.includes(d.id));
  const now        = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // The actual workflowId used by the backend (may differ from URL param)
  const apiWorkflowId = workflow.workflowId ?? workflowId;

  function openDashboard(dashId) {
    // lensId from workflow record; fall back to per-dashboard default
    const lensId = workflow.lensId ?? String(LENS_ID_MAP[dashId] ?? 1);
    navigate(
      `/media/dashboard/lens/${dashId}` +
      `?workflow_id=${apiWorkflowId}&lens=${lensId}&dash=${dashId}` +
      `&from=workflows&wf=${workflowId}`,
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dash-home" style={{ '--dash-primary': tplPrimary, background: tplBg }}>

      {/* ── Back navigation ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: '20px 32px 0' }}
      >
        <button className="wf-back-btn" onClick={() => navigate('/workflows')}>
          <ArrowLeft size={14} />
          All Workflows
        </button>
      </motion.div>

      {/* ── Workspace Header ─────────────────────────────────────── */}
      <motion.div
        className="dash-home-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        <div className="dash-home-brand">
          <div className="dash-home-brand-dot" style={{ background: tplPrimary }} />
          <div>
            <h1 className="dash-home-brand-name">{workflow.name}</h1>
            <p className="dash-home-brand-sub">
              Dashboard Workspace · {dashboards.length} active lens{dashboards.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <div className="dash-home-meta">
          <span className="dash-home-date">
            <Clock size={12} />
            Updated {fmtDate(workflow.updatedAt)}
          </span>
          {template && (
            <span
              className="dash-home-tpl-badge"
              style={{ borderColor: `${tplPrimary}44`, color: tplPrimary }}
            >
              {template.name}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="dash-home-divider" style={{ background: `${tplPrimary}22` }} />

      {/* ── No dashboards ─────────────────────────────────────────── */}
      {dashboards.length === 0 && (
        <div className="wf-empty" style={{ paddingTop: 60 }}>
          <Layers size={40} strokeWidth={1.2} style={{ color: 'var(--mi-text-3)' }} />
          <p className="wf-empty-msg">No dashboards found for this workflow.</p>
          <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={() => navigate('/workflows')}>
            Back to Workflows
          </button>
        </div>
      )}

      {/* ── Dashboard Cards ──────────────────────────────────────── */}
      {dashboards.length > 0 && (
        <motion.div
          className="dash-home-grid"
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
        >
          {dashboards.map((dash) => {
            const meta = DASH_META[dash.id] ?? {};
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
      )}
    </div>
  );
}

// ── DashCard ──────────────────────────────────────────────────────────────────

function DashCard({ dash, meta, Icon, tplPrimary, now, onOpen }) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="dash-home-card"
      style={{ '--card-tint': dash.tint, '--card-primary': tplPrimary }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Hero image */}
      <div className="dash-home-card-hero">
        <img src={meta.heroImg} alt={dash.name} className="dash-home-card-img" loading="lazy" />
        <div
          className="dash-home-card-overlay"
          style={{ background: `linear-gradient(160deg, ${dash.tint}cc 0%, ${tplPrimary}88 100%)` }}
        />
        <div className="dash-home-card-num">{dash.num}</div>
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
              style={{
                background: `linear-gradient(90deg, ${dash.tint}, ${tplPrimary})`,
                width: '68%',
              }}
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
            Open Dashboard
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
