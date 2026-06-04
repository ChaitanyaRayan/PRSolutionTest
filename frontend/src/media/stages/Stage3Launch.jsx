import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Zap, FileText, Settings, Layout } from 'lucide-react';
import { useMediaStore } from '../store/mediaStore';
import { projectsApi, uploadsApi } from '../api/client';
import { useWorkflowWS } from '../hooks/useWorkflowWS';
import { ErrorBanner } from '../components/ErrorBanner';

export default function Stage3Launch() {
  const navigate = useNavigate();
  const store = useMediaStore();

  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState(null);
  const [workflowId,      setWorkflowIdLocal] = useState(store.workflowId);

  // Hook drives pipeline completion via store; component reads store for UI
  useWorkflowWS(workflowId);

  const pipelineComplete = store.pipelineComplete;
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

  function goToReview() {
    navigate(`/media/review?workflow_id=${workflowId}&lens=${store.lensId}`);
  }

  return (
    <div className="mi-stage mi-stage--launch">
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-header" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mi-stage-eyebrow">
          <span className="mi-step-badge">03</span>
          <span>Pipeline Execution</span>
        </div>
        <h1 className="mi-stage-title">Review & launch</h1>
        <p className="mi-stage-subtitle">
          Confirm your workflow configuration, then launch the AI analysis pipeline. Monitor progress in real-time.
        </p>
      </motion.div>

      <ErrorBanner message={submitError} onRetry={handleSubmit} />

      {/* ── Workflow summary cards ───────────────────────────────── */}
      {!workflowId && (
        <motion.div className="mi-launch-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <SummaryCard icon={<FileText size={15} />} label="Dataset">
            <p className="mi-summary-value">{store.fileName || 'No file selected'}</p>
            {store.brandKeywords.length > 0 && (
              <div className="mi-summary-tags">
                {store.brandKeywords.map((k) => <span key={k} className="mi-tag mi-tag--sm">{k}</span>)}
              </div>
            )}
          </SummaryCard>

          <SummaryCard icon={<Layout size={15} />} label="Dashboard">
            <p className="mi-summary-value">{store.selectedDashboard?.name ?? '—'}</p>
            <p className="mi-summary-sub">{store.dashboardTitle}</p>
          </SummaryCard>

          <SummaryCard icon={<Settings size={15} />} label="Analysis settings">
            <p className="mi-summary-value">{store.brandName}</p>
            {store.competitors.length > 0 && (
              <p className="mi-summary-sub">{store.competitors.length} competitor{store.competitors.length !== 1 ? 's' : ''} tracked</p>
            )}
            {store.messageKeywords.length > 0 && (
              <p className="mi-summary-sub">{store.messageKeywords.length} message keyword{store.messageKeywords.length !== 1 ? 's' : ''}</p>
            )}
            {store.skillPrompt && <p className="mi-summary-sub">Custom skill prompt set</p>}
          </SummaryCard>
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
                {!pipelineComplete && <Loader2 size={16} className="mi-spin" style={{ color: 'var(--mi-primary)' }} />}
                {pipelineComplete  && <CheckCircle2 size={16} style={{ color: '#16a34a' }} />}
                <span className="mi-pipeline-status-label">
                  {pipelineComplete ? 'Pipeline complete' : 'Pipeline running…'}
                </span>
                <span className="mi-pipeline-wf-id">workflow: {workflowId}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <motion.div className="mi-stage-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <button className="mi-btn mi-btn--ghost" onClick={() => navigate('/media/configure')}>← Back</button>

        {!workflowId && (
          <motion.button
            className="mi-btn mi-btn--primary"
            onClick={handleSubmit}
            disabled={submitting || !store.file || !store.selectedDashboard}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? <Loader2 size={14} className="mi-spin" /> : <Zap size={14} />}
            {submitting ? 'Launching…' : 'Launch Pipeline'}
          </motion.button>
        )}

        {pipelineComplete && (
          <motion.button
            className="mi-btn mi-btn--primary"
            onClick={goToReview}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle2 size={14} />
            Review Articles
          </motion.button>
        )}

        {!pipelineComplete && workflowId && (
          <button className="mi-btn mi-btn--outline mi-btn--sm" onClick={goToReview}>
            View partial results →
          </button>
        )}
      </motion.div>
    </div>
  );
}

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
