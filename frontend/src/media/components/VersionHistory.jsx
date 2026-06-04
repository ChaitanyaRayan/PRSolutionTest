/**
 * VersionHistory — Slide-in drawer showing all dashboard versions.
 * Users can compare and restore previous states.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw, Loader2, Clock, GitBranch } from 'lucide-react';

export function VersionHistory({ workflowId, onRestore, onClose, theme }) {
  const [versions, setVersions]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [restoring, setRestoring] = useState(null);

  const primary = theme?.primaryColor ?? '#7C3AED';

  useEffect(() => {
    if (!workflowId) return;
    fetch(`/api/dashboard/${workflowId}/versions`)
      .then((r) => r.json())
      .then((v) => setVersions(v.reverse()))   // newest first
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [workflowId]);

  async function handleRestore(versionId) {
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/dashboard/${workflowId}/restore/${versionId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Restore failed');
      const newConfig = await res.json();
      onRestore?.(newConfig);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <motion.div
      className="eng-history-panel"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="eng-history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <GitBranch size={15} style={{ color: primary }} />
          <span className="eng-history-title">Version History</span>
        </div>
        <button className="mi-btn-icon" onClick={onClose}><X size={16} /></button>
      </div>

      {/* Versions list */}
      <div className="eng-history-list">
        {loading ? (
          <div className="eng-history-loading">
            <Loader2 size={18} className="mi-spin" style={{ color: primary }} />
            <span>Loading versions…</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="eng-history-empty">
            <Clock size={24} style={{ color: 'var(--mi-text-3)' }} />
            <p>No versions yet</p>
          </div>
        ) : (
          versions.map((v, i) => (
            <motion.div
              key={v.versionId}
              className={`eng-version-item ${i === 0 ? 'eng-version-item--current' : ''}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="eng-version-dot" style={{ background: i === 0 ? primary : 'var(--mi-border-md)' }} />
              <div className="eng-version-info">
                <span className="eng-version-label">{v.label ?? `Version ${v.version}`}</span>
                <span className="eng-version-meta">
                  v{v.version} · {formatRelTime(v.createdAt)}
                </span>
              </div>
              {i > 0 && (
                <motion.button
                  className="eng-version-restore"
                  onClick={() => handleRestore(v.versionId)}
                  disabled={restoring === v.versionId}
                  style={{ borderColor: `${primary}30`, color: primary }}
                  whileHover={{ scale: 1.04 }}
                >
                  {restoring === v.versionId
                    ? <Loader2 size={11} className="mi-spin" />
                    : <RotateCcw size={11} />
                  }
                  Restore
                </motion.button>
              )}
              {i === 0 && <span className="eng-version-current-badge" style={{ background: `${primary}15`, color: primary }}>Current</span>}
            </motion.div>
          ))
        )}
      </div>

      <div className="eng-history-footer">
        <p className="eng-history-hint">
          Every AI modification creates a new version. Restore any previous state without losing history.
        </p>
      </div>
    </motion.div>
  );
}

function formatRelTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}
