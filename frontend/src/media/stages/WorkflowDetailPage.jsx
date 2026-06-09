/**
 * WorkflowDetailPage — Shows all lens branches for a saved workflow.
 * Route: /workflows/:workflowId
 *
 * API response shape (GET /workflow/:id):
 *   workflow.workflow.branches[].analysis.lens_details = { id, label }
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, BarChart2, Layers, Zap, Star,
  ArrowRight, Activity, FileSearch,
} from 'lucide-react';
import { projectsApi } from '../api/client';

// ── Lens metadata keyed by lens label (lowercased) ───────────────────────────

const LENS_META = {
  'media measurement': {
    icon: BarChart2,
    heroImg: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    description: 'Track total article volume, source distribution, and coverage velocity across all media channels.',
    starters: [
      { icon: '📊', text: 'What is the overall sentiment picture?' },
      { icon: '🏆', text: 'Which source has the strongest PR performance?' },
      { icon: '🔥', text: 'What topics are driving the most media coverage?' },
      { icon: '📱', text: 'Break down the social vs traditional media coverage split' },
    ],
  },
  'media monitoring': {
    icon: Activity,
    heroImg: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    description: 'Monitor brand mentions, sentiment shifts, and emerging media narratives in real-time.',
    starters: [
      { icon: '📈', text: 'Show me sentiment trends over the last 7 days' },
      { icon: '⚠️', text: 'What are the top risk signals this week?' },
      { icon: '🎯', text: 'Which journalists covered us the most?' },
      { icon: '🔍', text: 'Compare brand vs competitor coverage volume' },
    ],
  },
  'narrative intelligence': {
    icon: Layers,
    heroImg: 'https://images.unsplash.com/photo-1553484771-047a44eee27a?w=600&q=80',
    description: 'Identify active narratives, track their lifecycle, and understand thematic clustering.',
    starters: [
      { icon: '💡', text: 'What narratives are gaining traction?' },
      { icon: '📉', text: 'Which themes are declining in coverage?' },
      { icon: '🔗', text: 'How do our key messages land in coverage?' },
      { icon: '🌐', text: 'Show me the narrative map this month' },
    ],
  },
  'pr impact': {
    icon: Zap,
    heroImg: 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600&q=80',
    description: 'Measure earned media value, PR campaign ROI, and spokesperson effectiveness.',
    starters: [
      { icon: '💰', text: 'What is our earned media value this quarter?' },
      { icon: '📣', text: 'Which campaign drove the highest impact?' },
      { icon: '🎙️', text: 'How effective are our spokespeople?' },
      { icon: '📰', text: 'Show PR impact score by outlet tier' },
    ],
  },
  'reputation intelligence': {
    icon: Star,
    heroImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    description: 'Score and track brand reputation across trust, quality, and advocacy dimensions.',
    starters: [
      { icon: '⭐', text: 'What is our current reputation score?' },
      { icon: '📊', text: 'How has trust perception changed this month?' },
      { icon: '🆚', text: 'Compare our reputation vs top competitors' },
      { icon: '🔔', text: 'Flag any emerging reputation risks' },
    ],
  },
};

const TINTS = [
  '#7C3AED', '#1192e8', '#007d79', '#eb6200', '#d02670', '#d2a106',
];

function getLensMeta(label) {
  if (!label) return null;
  const key = label.toLowerCase();
  return (
    LENS_META[key] ??
    Object.entries(LENS_META).find(([k]) => key.includes(k) || k.includes(key))?.[1] ??
    {
      icon: FileSearch,
      heroImg: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
      description: `${label} analysis and intelligence dashboard.`,
      starters: [],
    }
  );
}

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
      .finally(() => setLoading(false));
  }, [workflowId]);

  if (loading) {
    return (
      <div className="wf-detail-center">
        <div className="mi-spin" style={{ width: 28, height: 28, border: '3px solid var(--mi-border-md)', borderTopColor: 'var(--mi-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

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

  // Extract branches from the API response
  const branches = workflow.workflow?.branches ?? [];
  const clientName = workflow.workflow?.branches?.[0]?.assembly?.branding?.client_name
    ?? workflow.name
    ?? 'Workflow';
  const apiWorkflowId = workflow.id ?? workflowId;

  function openLens(branch, branchIndex) {
    const lensId = branch.analysis?.lens_details?.id ?? branchIndex + 1;
    navigate(
      `/media/dashboard?workflow_id=${apiWorkflowId}&lens_id=${lensId}`
    );
  }

  return (
    <div className="wf-detail-page">

      {/* ── Back ───────────────────────────────────────────────── */}
      <div className="wf-detail-topbar">
        <button className="wf-back-btn" onClick={() => navigate('/workflows')}>
          <ArrowLeft size={14} /> All Workflows
        </button>
        <div className="wf-detail-meta">
          <Clock size={12} />
          <span>{fmtDate(workflow.created_at ?? workflow.createdAt)}</span>
          <span className="wf-detail-id">#{apiWorkflowId}</span>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        className="wf-detail-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="wf-detail-header-left">
          <h1 className="wf-detail-title">{clientName}</h1>
          <p className="wf-detail-subtitle">
            {branches.length} analysis lens{branches.length !== 1 ? 'es' : ''} · Select a dashboard to explore
          </p>
        </div>
      </motion.div>

      {/* ── Empty ──────────────────────────────────────────────── */}
      {branches.length === 0 && (
        <div className="wf-empty" style={{ paddingTop: 60 }}>
          <Layers size={40} strokeWidth={1.2} style={{ color: 'var(--mi-text-3)' }} />
          <p className="wf-empty-msg">No analysis branches found for this workflow.</p>
        </div>
      )}

      {/* ── Lens cards ─────────────────────────────────────────── */}
      {branches.length > 0 && (
        <motion.div
          className="wf-lens-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {branches.map((branch, i) => {
            const lens   = branch.analysis?.lens_details ?? {};
            const label  = lens.label ?? `Lens ${i + 1}`;
            const meta   = getLensMeta(label);
            const tint   = TINTS[i % TINTS.length];
            const Icon   = meta.icon;
            return (
              <LensCard
                key={i}
                label={label}
                meta={meta}
                Icon={Icon}
                tint={tint}
                branch={branch}
                onOpen={() => openLens(branch, i)}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ── LensCard ──────────────────────────────────────────────────────────────────

function LensCard({ label, meta, Icon, tint, branch, onOpen }) {
  const competitors = branch.analysis?.competitors ?? [];
  const hasSkill    = !!branch.analysis?.skill_prompt;

  return (
    <motion.div
      className="wf-lens-card"
      variants={{
        hidden:   { opacity: 0, y: 24 },
        visible:  { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Hero */}
      <div className="wf-lens-hero" style={{ background: `linear-gradient(160deg, ${tint}dd 0%, ${tint}88 100%)` }}>
        <img src={meta.heroImg} alt={label} className="wf-lens-hero-img" loading="lazy" />
        <div className="wf-lens-hero-overlay" style={{ background: `linear-gradient(160deg, ${tint}cc 0%, ${tint}55 100%)` }} />
        <div className="wf-lens-hero-icon">
          <Icon size={24} color="#fff" strokeWidth={1.5} />
        </div>
        <div className="wf-lens-hero-label">{label}</div>
      </div>

      {/* Body */}
      <div className="wf-lens-body">
        <p className="wf-lens-desc">{meta.description}</p>

        {/* Starters */}
        {meta.starters.length > 0 && (
          <div className="wf-lens-starters">
            <p className="wf-lens-starters-label">What would you like to know?</p>
            <div className="wf-lens-starters-grid">
              {meta.starters.map((s, i) => (
                <button key={i} className="wf-lens-starter-btn" onClick={onOpen}>
                  <span className="wf-lens-starter-icon">{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="wf-lens-tags">
          {competitors.map((c) => (
            <span key={c} className="wf-lens-tag" style={{ borderColor: `${tint}44`, color: tint, background: `${tint}10` }}>
              vs {c}
            </span>
          ))}
          {hasSkill && (
            <span className="wf-lens-tag" style={{ borderColor: `${tint}44`, color: tint, background: `${tint}10` }}>
              Custom Prompt
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          className="wf-lens-open-btn"
          style={{ background: tint }}
          onClick={onOpen}
        >
          Open Dashboard <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}
