/**
 * WorkflowsPage — Central hub listing all saved workflows.
 * Route: /workflows
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Clock, ArrowRight, Layers, X,
} from 'lucide-react';
import { projectsApi }    from '../api/client';
import { HTML_TEMPLATES } from '../constants/templates';
import { DASHBOARDS }     from '../constants/dashboards';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function templateName(id) {
  const t = HTML_TEMPLATES.find((t) => t.id === id);
  return t?.name ?? id ?? '—';
}

function dashboardLabel(id) {
  const d = DASHBOARDS.find((d) => d.id === id);
  return d?.name ?? id;
}

function dashboardTint(id) {
  const d = DASHBOARDS.find((d) => d.id === id);
  return d?.tint ?? '#6366f1';
}

function statusMeta(status) {
  if (!status) return { label: 'Unknown', color: '#9ca3af' };
  const s = status.toLowerCase();
  if (s === 'complete' || s === 'completed') return { label: 'Complete', color: '#16a34a' };
  if (s === 'active')                        return { label: 'Active',   color: '#16a34a' };
  if (s === 'draft')                         return { label: 'Draft',    color: '#d97706' };
  if (s === 'error' || s === 'failed')       return { label: 'Error',    color: '#dc2626' };
  if (s === 'processing')                    return { label: 'Processing', color: '#6366f1' };
  return { label: status, color: '#6366f1' };
}

// ── WorkflowsPage ─────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [filterDash, setFilterDash]       = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');

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
      list = list.filter(
        (w) =>
          w.name?.toLowerCase().includes(q) ||
          w.lensId?.toLowerCase().includes(q) ||
          w.description?.toLowerCase().includes(q),
      );
    }
    if (filterDash)     list = list.filter((w) => w.dashboardTypes?.includes(filterDash));
    if (filterTemplate) list = list.filter((w) => w.templateId === filterTemplate);
    return list;
  }, [workflows, search, filterDash, filterTemplate]);

  const allDashTypes = useMemo(() => {
    const s = new Set();
    workflows.forEach((w) => w.dashboardTypes?.forEach((t) => s.add(t)));
    return [...s];
  }, [workflows]);

  const allTemplates = useMemo(() => {
    const s = new Set();
    workflows.forEach((w) => { if (w.templateId) s.add(w.templateId); });
    return [...s];
  }, [workflows]);

  const hasFilters = search || filterDash || filterTemplate;
  const clearFilters = () => { setSearch(''); setFilterDash(''); setFilterTemplate(''); };

  function openWorkflow(wf) {
    // Use workflowId if present; fall back to id
    navigate(`/workflows/${wf.workflowId || wf.id}`);
  }

  return (
    <div className="wf-page">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="wf-page-header">
        <div className="wf-page-header-content">
          <div>
            <h1 className="wf-page-title">Workflows</h1>
            <p className="wf-page-subtitle">
              {loading
                ? 'Loading…'
                : `${workflows.length} saved workflow${workflows.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="mi-btn mi-btn--primary" onClick={() => navigate('/media/upload')}>
            + New Workflow
          </button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="wf-toolbar">
        <div className="wf-search-wrap">
          <Search size={15} className="wf-search-icon" />
          <input
            className="wf-search-input"
            type="text"
            placeholder="Search workflows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="wf-filters">
          <select
            className="wf-filter-select"
            value={filterDash}
            onChange={(e) => setFilterDash(e.target.value)}
          >
            <option value="">All Dashboards</option>
            {allDashTypes.map((t) => (
              <option key={t} value={t}>{dashboardLabel(t)}</option>
            ))}
          </select>
          <select
            className="wf-filter-select"
            value={filterTemplate}
            onChange={(e) => setFilterTemplate(e.target.value)}
          >
            <option value="">All Templates</option>
            {allTemplates.map((id) => (
              <option key={id} value={id}>{templateName(id)}</option>
            ))}
          </select>
          {hasFilters && (
            <button className="wf-clear-btn" onClick={clearFilters}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="wf-error-banner">
          Failed to load workflows: {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {loading && (
        <div className="wf-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="wf-card wf-card--skeleton">
              <div className="wf-sk wf-sk--title" />
              <div className="wf-sk wf-sk--line" />
              <div className="wf-sk wf-sk--line wf-sk--short" />
              <div className="wf-sk wf-sk--pills">
                <div className="wf-sk wf-sk--pill" />
                <div className="wf-sk wf-sk--pill" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="wf-empty">
          <Layers size={42} strokeWidth={1.2} style={{ color: 'var(--mi-text-3)' }} />
          <p className="wf-empty-msg">
            {hasFilters
              ? 'No workflows match your search.'
              : 'No workflows yet. Create your first one!'}
          </p>
          {!hasFilters && (
            <button className="mi-btn mi-btn--primary" onClick={() => navigate('/media/upload')}>
              Create Workflow
            </button>
          )}
          {hasFilters && (
            <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Workflow grid ─────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <motion.div
          className="wf-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {filtered.map((wf) => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onClick={() => openWorkflow(wf)}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── WorkflowCard ──────────────────────────────────────────────────────────────

function WorkflowCard({ wf, onClick }) {
  const { label: statusLabel, color: statusColor } = statusMeta(wf.status);

  return (
    <motion.div
      className="wf-card"
      variants={{
        hidden:   { opacity: 0, y: 24 },
        visible:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      {/* Header */}
      <div className="wf-card-header">
        <div className="wf-card-title-row">
          <h3 className="wf-card-title">{wf.name}</h3>
          {wf.status && (
            <span
              className="wf-card-status"
              style={{
                background:  `${statusColor}18`,
                color:        statusColor,
                borderColor: `${statusColor}44`,
              }}
            >
              {statusLabel}
            </span>
          )}
        </div>
        {wf.description && (
          <p className="wf-card-desc">{wf.description}</p>
        )}
      </div>

      {/* Meta: Lens + Template */}
      <div className="wf-card-meta">
        <div className="wf-card-meta-item">
          <span className="wf-card-meta-label">LENS</span>
          <span className="wf-card-meta-val">{wf.lensId ?? '—'}</span>
        </div>
        <div className="wf-card-meta-item">
          <span className="wf-card-meta-label">TEMPLATE</span>
          <span className="wf-card-meta-val">{templateName(wf.templateId)}</span>
        </div>
      </div>

      {/* Dashboard type pills */}
      {wf.dashboardTypes?.length > 0 && (
        <div className="wf-card-dashboards">
          {wf.dashboardTypes.map((type) => {
            const tint = dashboardTint(type);
            return (
              <span
                key={type}
                className="wf-card-dash-pill"
                style={{
                  background:  `${tint}18`,
                  color:        tint,
                  borderColor: `${tint}44`,
                }}
              >
                {dashboardLabel(type)}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer: dates + CTA */}
      <div className="wf-card-footer">
        <div className="wf-card-dates">
          <span className="wf-card-date">
            <Calendar size={10} />
            {fmtDate(wf.createdAt)}
          </span>
          <span className="wf-card-date">
            <Clock size={10} />
            {fmtDate(wf.updatedAt)}
          </span>
        </div>
        <button className="wf-card-btn" onClick={onClick}>
          Open <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}
