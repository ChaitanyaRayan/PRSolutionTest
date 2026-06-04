/**
 * Stage7Dashboard — Entry point for the dashboard experience.
 *
 * Decision tree:
 *  - If multiple dashboards were selected → show DashboardHomepage (workspace)
 *  - If a specific lens is requested via ?dash= param → open that lens' DashboardEngine
 *  - If single dashboard selected → open DashboardEngine directly
 *
 * Retrieval uses BOTH workflowId AND lensId per the new API spec.
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMediaStore } from '../store/mediaStore';
import DashboardHomepage from './DashboardHomepage';
import DashboardEngine   from '../engine/DashboardEngine';

export default function Stage7Dashboard() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const store = useMediaStore();

  // Support both store state and URL query params
  const workflowId = searchParams.get('workflow_id') ?? store.workflowId;
  const lensId     = searchParams.get('lens')        ?? store.lensId;
  const dashId     = searchParams.get('dash');       // specific lens to open
  const brandName  = store.brandName;
  const template   = store.selectedTemplate;

  const selectedDashboards = store.selectedDashboards ?? [];
  const isMulti = selectedDashboards.length > 1;

  if (!workflowId) {
    return (
      <div className="mi-stage">
        <p style={{ color: 'var(--mi-text-2)' }}>
          No workflow found.{' '}
          <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={() => navigate('/media/upload')}>
            Start over
          </button>
        </p>
      </div>
    );
  }

  // A specific dashboard lens was clicked from the homepage
  if (dashId) {
    const from   = searchParams.get('from');
    const wfParam = searchParams.get('wf');
    return (
      <DashboardEngine
        workflowId={workflowId}
        lensId={lensId}
        brandName={brandName}
        template={template}
        dashboardId={dashId}
        onBack={() => {
          // If opened from the Workflows hub, go back to the workflow detail page
          if (from === 'workflows' && wfParam) {
            navigate(`/workflows/${wfParam}`);
          } else if (isMulti) {
            navigate(`/media/dashboard?workflow_id=${workflowId}&lens=${lensId}`);
          } else {
            navigate(-1);
          }
        }}
      />
    );
  }

  // Multi-dashboard → show workspace homepage
  if (isMulti) {
    return (
      <DashboardHomepage
        workflowId={workflowId}
        lensId={lensId}
        brandName={brandName}
        template={template}
      />
    );
  }

  // Single dashboard → go straight to engine
  return (
    <DashboardEngine
      workflowId={workflowId}
      lensId={lensId}
      brandName={brandName}
      template={template}
      onBack={() => navigate(-1)}
    />
  );
}
