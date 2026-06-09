import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Loader2, Zap, FileText, Settings, Layout,
  GitBranch, ChevronDown, ChevronRight, Code2
} from 'lucide-react';
import { useMediaStore } from '../store/mediaStore';
import { projectsApi, uploadsApi } from '../api/client';
import { useWorkflowWS } from '../hooks/useWorkflowWS';
import { ErrorBanner } from '../components/ErrorBanner';
import { DASHBOARDS, DASHBOARD_MAP } from '../constants/dashboards';
import { HTML_TEMPLATES } from '../constants/templates';

export default function Stage3Launch() {
  const navigate = useNavigate();
  const store = useMediaStore();

  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState(null);
  const [workflowId,      setWorkflowIdLocal] = useState(store.workflowId);
  const [payloadExpanded, setPayloadExpanded] = useState(false);

  useWorkflowWS(workflowId);

  const pipelineComplete  = store.pipelineComplete;
  const selectedDashboards = store.selectedDashboards ?? [];
  const isMulti = selectedDashboards.length > 1;

  // Build payload fresh on each render so it reflects current store state
  const payload = store.buildWorkflowPayload();

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    store.setPipelineComplete(false);
    try {
      let resp;
      if (store.workflowId) {
        resp = await projectsApi.update(store.workflowId, payload);
      } else {
        resp = await projectsApi.submitWorkflow(payload);
      }

      if (!resp?.id) throw new Error('Invalid response from server — no workflow ID returned');

      const wfId = String(resp.id);
      setWorkflowIdLocal(wfId);
      store.setWorkflowId(wfId);

      if (store.file) {
        await uploadsApi.withWorkflow(wfId, store.file);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function goToDashboard() {
    // Auto-select a random template if none chosen yet
    if (!store.selectedTemplate) {
      const randomTpl = HTML_TEMPLATES[Math.floor(Math.random() * HTML_TEMPLATES.length)];
      store.setSelectedTemplate(randomTpl);
    }
    navigate(`/media/dashboard?workflow_id=${workflowId}&lens=${store.lensId}`);
  }

  // Keep for backward compat (legacy button text says "Review Articles")
  function goToReview() { goToDashboard(); }

  const canLaunch = !submitting && store.file && selectedDashboards.length > 0;

  return (
    <div className="mi-stage mi-stage--launch">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-header" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">03</span>
          <span>Pipeline Execution</span>
        </div>
        <h1 className="mi-stage-title">Review &amp; launch</h1>
        <p className="mi-stage-subtitle">
          Confirm your workflow configuration, then launch the AI analysis pipeline.
          {isMulti && (
            <strong> {selectedDashboards.length} dashboard branches will be created.</strong>
          )}
        </p>
      </motion.div>

      <ErrorBanner message={submitError} onRetry={handleSubmit} />

      {/* ── Workflow summary ─────────────────────────────────────── */}
      {!workflowId && (
        <motion.div
          className="mi-launch-summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {/* Dataset card */}
          <SummaryCard icon={<FileText size={15} />} label="Dataset">
            <p className="mi-summary-value">{store.fileName || 'No file selected'}</p>
            {store.brandKeywords.length > 0 && (
              <div className="mi-summary-tags">
                {store.brandKeywords.map((k) => (
                  <span key={k} className="mi-tag mi-tag--sm">{k}</span>
                ))}
              </div>
            )}
          </SummaryCard>

          {/* Dashboards card — multi-branch aware */}
          <SummaryCard icon={<GitBranch size={15} />} label={isMulti ? `Dashboards (${selectedDashboards.length} branches)` : 'Dashboard'}>
            {selectedDashboards.length === 0 ? (
              <p className="mi-summary-value">—</p>
            ) : (
              <div className="mi-launch-branches">
                {selectedDashboards.map((id, i) => {
                  const dash = DASHBOARD_MAP[id];
                  return (
                    <div key={id} className="mi-launch-branch-row">
                      <span
                        className="mi-launch-branch-dot"
                        style={{ background: dash?.tint ?? '#888' }}
                      />
                      <span className="mi-launch-branch-num">Branch {i + 1}</span>
                      <span className="mi-launch-branch-name">{dash?.name ?? id}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mi-summary-sub" style={{ marginTop: 6 }}>{store.dashboardTitle}</p>
          </SummaryCard>

          {/* Analysis settings card */}
          <SummaryCard icon={<Settings size={15} />} label="Analysis settings">
            <p className="mi-summary-value">{store.brandName}</p>
            {store.competitors.length > 0 && (
              <p className="mi-summary-sub">
                {store.competitors.length} competitor{store.competitors.length !== 1 ? 's' : ''} tracked
              </p>
            )}
            {store.messageKeywords.length > 0 && (
              <p className="mi-summary-sub">
                {store.messageKeywords.length} narrative keyword{store.messageKeywords.length !== 1 ? 's' : ''}
              </p>
            )}
            {store.skillPrompt && <p className="mi-summary-sub">Custom monitoring prompt set</p>}
          </SummaryCard>
        </motion.div>
      )}

      {/* ── Payload inspector (collapsible) ──────────────────────── */}
      {!workflowId && (
        <motion.div
          className="mi-payload-inspector"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            className="mi-payload-toggle"
            onClick={() => setPayloadExpanded((p) => !p)}
          >
            <Code2 size={13} />
            <span>
              Payload preview — {payload.workflow?.branches?.length ?? 0} branch{payload.workflow?.branches?.length !== 1 ? 'es' : ''}
            </span>
            {payloadExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          <AnimatePresence>
            {payloadExpanded && (
              <motion.div
                className="mi-payload-body"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
              >
                <pre className="mi-payload-pre">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Pipeline status ─────────────────────────────────────── */}
      <AnimatePresence>
        {workflowId && (
          <motion.div
            className="mi-pipeline-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mi-pipeline-header">
              <div className="mi-pipeline-status-row">
                {!pipelineComplete && (
                  <Loader2 size={16} className="mi-spin" style={{ color: 'var(--mi-primary)' }} />
                )}
                {pipelineComplete && (
                  <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                )}
                <span className="mi-pipeline-status-label">
                  {pipelineComplete ? 'Pipeline complete' : 'Pipeline running…'}
                </span>
                <span className="mi-pipeline-wf-id">workflow: {workflowId}</span>
              </div>

              {/* Per-branch progress */}
              {isMulti && (
                <div className="mi-pipeline-branches">
                  {selectedDashboards.map((id) => {
                    const dash = DASHBOARD_MAP[id];
                    return (
                      <span key={id} className="mi-pipeline-branch-chip" style={{ borderColor: `${dash?.tint}44`, color: dash?.tint }}>
                        {pipelineComplete
                          ? <CheckCircle2 size={10} />
                          : <Loader2 size={10} className="mi-spin" />
                        }
                        {dash?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
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
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/configure')}>
          ← Back
        </button>

        {!workflowId && (
          <motion.button
            className="mi-btn mi-btn--primary"
            onClick={handleSubmit}
            disabled={!canLaunch}
            whileHover={canLaunch ? { scale: 1.02 } : {}}
            whileTap={canLaunch ? { scale: 0.98 } : {}}
          >
            {submitting ? <Loader2 size={14} className="mi-spin" /> : <Zap size={14} />}
            {submitting
              ? 'Launching…'
              : isMulti
                ? `Launch ${selectedDashboards.length}-Branch Pipeline`
                : 'Launch Pipeline'
            }
          </motion.button>
        )}

        {pipelineComplete && (
          <motion.button
            className="mi-btn mi-btn--primary"
            onClick={goToDashboard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle2 size={14} />
            Open Dashboard
          </motion.button>
        )}

        {!pipelineComplete && workflowId && (
          <button className="mi-btn mi-btn--outline mi-btn--sm" onClick={goToDashboard} disabled={!pipelineComplete}>
            View partial results →
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ── SummaryCard ───────────────────────────────────────────────────────────────
function SummaryCard({ icon, label, children }) {
  return (
    <div className="mi-summary-card">
      <div className="mi-summary-card-header">
        <span className="mi-summary-icon">{icon}</span>
        <span className="mi-summary-label">{label}</span>
      </div>
      <div className="mi-summary-body">{children}</div>
    </div>
  );
}
