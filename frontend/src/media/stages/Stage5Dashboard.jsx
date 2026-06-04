/**
 * Stage5Dashboard — Entry point for the AI-driven dashboard.
 * Delegates entirely to DashboardEngine — this stage is just a router/loader.
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMediaStore } from '../store/mediaStore';
import DashboardEngine from '../engine/DashboardEngine';

export default function Stage5Dashboard() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();

  const workflowId = searchParams.get('workflow_id') ?? useMediaStore.getState().workflowId;
  const lensId     = searchParams.get('lens')        ?? useMediaStore.getState().lensId;
  const brandName  = useMediaStore((s) => s.brandName);

  if (!workflowId) {
    return (
      <div className="mi-stage">
        <p style={{ color: 'var(--mi-text-2)' }}>
          No workflow found. <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={() => navigate('/media/upload')}>Start over</button>
        </p>
      </div>
    );
  }

  return (
    <DashboardEngine
      workflowId={workflowId}
      brandName={brandName}
      lensId={lensId}
      onBack={() => navigate(-1)}
    />
  );
}
