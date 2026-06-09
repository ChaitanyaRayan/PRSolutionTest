/**
 * WorkflowsPage — Central hub listing all saved workflows.
 * Rich card visualization: template color bar, lens badges, sentiment sparkline,
 * status chip, date display.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Clock, ArrowRight, Layers, Plus,
  BarChart2, Eye, Zap, Star, Activity, X, TrendingUp,
} from 'lucide-react';
import { projectsApi }    from '../api/client';
import { HTML_TEMPLATES } from '../constants/templates';
import { DASHBOARDS }     from '../constants/dashboards';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtRelative(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  if (days <  7) return `${days}d ago`;
  return fmtDate(iso);
}
function templateForWorkflow(wf) {
  const id = wf.templateId ?? wf.workflow?.assembly?.template?.id;
  return HTML_TEMPLATES.find((t) => t.id === id) ?? null;
}
function dashboardsForWorkflow(wf) {
  const types = wf.dashboardTypes ?? wf.workflow?.branches?.map(b => b.analysis?.lens_details?.id) ?? [];
  return DASHBOARDS.filter((d) => types.includes(d.id));
}
function statusMeta(status) {
  const s = (status ?? '').toLowerCase();
  if (s === 'complete' || s === 'completed') return { label: 'Complete',   color: '#16a34a', bg: '#f0fdf4' };
  if (s === 'running'  || s === 'active')    return { label: 'Running',    color: '#7c3aed', bg: '#f5f3ff' };
  if (s === 'draft')                         return { label: 'Draft',      color: '#d97706', bg: '#fffbeb' };
  if (s === 'error'    || s === 'failed')    return { label: 'Error',      color: '#dc2626', bg: '#fef2f2' };
  if (s === 'processing')                    return { label: 'Processing', color: '#0ea5e9', bg: '#f0f9ff' };
  return { label: status || 'Unknown', color: '#6b7280', bg: '#f9fafb' };
}
const LENS_ICONS = { intelligence: Eye, monitoring: Activity, narrative: Layers, pr: Zap, reputation: Star };
// Mini sparkline path (decorative)
const SPARKLINES = [
  'M0 24 C8 20 16 8 24 12 S40 20 48 14 S64 4 72 8 S88 18 96 14',
  'M0 18 C8 22 16 10 24 14 S40 6 48 10 S64 18 72 8 S88 12 96 16',
  'M0 20 C8 14 16 22 24 10 S40 16 48 8 S64 14 72 20 S88 6 96 12',
];

// ── WorkflowsPage ─────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    projectsApi.list()
      .then((data) => setWorkflows(Array.isArray(data) ? data : []))
      .catch((e)   => setError(e.message))
      .finally(()  => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = workflows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) => w.name?.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q));
    }
    if (filterStatus) list = list.filter((w) => (w.status ?? '').toLowerCase() === filterStatus);
    return list;
  }, [workflows, search, filterStatus]);

  const hasFilters = search || filterStatus;

  function openWorkflow(wf) {
    navigate(`/workflows/${wf.workflowId || wf.id}`);
  }

  return (
    <div className="wfp-page">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="wfp-header">
        <div>
          <h1 className="wfp-title">Workflows</h1>
          <p className="wfp-subtitle">
            {loading ? 'Loading…' : `${workflows.length} saved workflow${workflows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="wfp-new-btn" onClick={() => navigate('/media/upload')}>
          <Plus size={15} />
          New Workflow
        </button>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="wfp-toolbar">
        <div className="wfp-search-wrap">
          <Search size={14} className="wfp-search-icon" />
          <input className="wfp-search" type="text" placeholder="Search workflows…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="wfp-filters">
          <select className="wfp-filter-select" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="complete">Complete</option>
            <option value="running">Running</option>
            <option value="draft">Draft</option>
            <option value="error">Error</option>
          </select>
          {hasFilters && (
            <button className="wfp-clear-btn"
              onClick={() => { setSearch(''); setFilterStatus(''); }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && <div className="wfp-error">Failed to load workflows: {error}</div>}

      {/* ── Loading skeletons ──────────────────────────────────────── */}
      {loading && (
        <div className="wfp-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="wfp-card wfp-card--skeleton">
              <div className="wfp-sk-bar" />
              <div className="wfp-sk-body">
                <div className="wfp-sk wfp-sk--title" />
                <div className="wfp-sk wfp-sk--line" />
                <div className="wfp-sk wfp-sk--pills" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty ─────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="wfp-empty">
          <div className="wfp-empty-icon"><BarChart2 size={32} strokeWidth={1.2} /></div>
          <h3 className="wfp-empty-title">{hasFilters ? 'No results' : 'No workflows yet'}</h3>
          <p className="wfp-empty-sub">
            {hasFilters ? 'Try clearing your filters.' : 'Create your first media intelligence workflow.'}
          </p>
          {!hasFilters && (
            <button className="wfp-new-btn" onClick={() => navigate('/media/upload')}>
              <Plus size={14} /> Create Workflow
            </button>
          )}
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <motion.div className="wfp-grid"
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
          {filtered.map((wf, idx) => (
            <WorkflowCard key={wf.id} wf={wf} idx={idx} onClick={() => openWorkflow(wf)} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── WorkflowCard ──────────────────────────────────────────────────────────────

function WorkflowCard({ wf, idx, onClick }) {
  const status   = statusMeta(wf.status);
  const tpl      = templateForWorkflow(wf);
  const boards   = dashboardsForWorkflow(wf);
  const spark    = SPARKLINES[idx % SPARKLINES.length];
  const accentColor = tpl?.primaryColor ?? boards[0]?.tint ?? '#7C3AED';
  const bgColor     = tpl?.bgColor ?? '#f8f9fa';

  return (
    <motion.div
      className="wfp-card"
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22,1,0.36,1] } } }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      {/* ── Color header bar with sparkline ──────────────────────── */}
      <div className="wfp-card-hero" style={{ background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}08 100%)` }}>
        {/* Template palette dots */}
        <div className="wfp-card-palette">
          {(tpl?.palette ?? [accentColor]).slice(0,4).map((c, i) => (
            <span key={i} className="wfp-palette-dot" style={{ background: c }} />
          ))}
          {tpl && <span className="wfp-template-tag" style={{ color: accentColor }}>{tpl.name}</span>}
        </div>
        {/* Mini sparkline */}
        <svg className="wfp-sparkline" viewBox="0 0 96 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d={spark} stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
          <path d={spark + ' L96 28 L0 28 Z'} fill={`${accentColor}15`} />
        </svg>
      </div>

      {/* ── Card body ─────────────────────────────────────────────── */}
      <div className="wfp-card-body">
        {/* Title row */}
        <div className="wfp-card-title-row">
          <h3 className="wfp-card-title">{wf.name}</h3>
          <span className="wfp-status-chip"
            style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}30` }}>
            {status.label}
          </span>
        </div>

        {/* Dashboard lens badges */}
        <div className="wfp-lens-badges">
          {boards.length > 0
            ? boards.map((d) => {
                const Icon = LENS_ICONS[d.id] ?? BarChart2;
                return (
                  <span key={d.id} className="wfp-lens-badge" style={{ borderColor: `${d.tint}30`, color: d.tint }}>
                    <Icon size={10} strokeWidth={2} />
                    {d.name}
                  </span>
                );
              })
            : <span className="wfp-lens-badge wfp-lens-badge--empty">No lens</span>
          }
        </div>

        {/* Stats row */}
        <div className="wfp-card-stats">
          <div className="wfp-stat">
            <span className="wfp-stat-val" style={{ color: accentColor }}>
              {wf.articleCount ?? wf.total_count ?? '—'}
            </span>
            <span className="wfp-stat-label">articles</span>
          </div>
          <div className="wfp-stat">
            <span className="wfp-stat-val" style={{ color: accentColor }}>
              {wf.sentimentScore != null ? `${wf.sentimentScore}%` : '—'}
            </span>
            <span className="wfp-stat-label">sentiment</span>
          </div>
          <div className="wfp-stat">
            <span className="wfp-stat-val" style={{ color: accentColor }}>
              {wf.reachFormatted ?? (wf.reach ? `${(wf.reach/1e6).toFixed(1)}M` : '—')}
            </span>
            <span className="wfp-stat-label">reach</span>
          </div>
        </div>

        {/* Footer */}
        <div className="wfp-card-footer">
          <div className="wfp-card-dates">
            {wf.updatedAt && (
              <span className="wfp-card-date">
                <Clock size={10} />
                {fmtRelative(wf.updatedAt)}
              </span>
            )}
            {wf.createdAt && (
              <span className="wfp-card-date">
                <Calendar size={10} />
                {fmtDate(wf.createdAt)}
              </span>
            )}
          </div>
          <button className="wfp-open-btn" onClick={onClick}
            style={{ background: accentColor }}>
            Open <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
