/**
 * Stage7Dashboard — Entry point for the dashboard experience.
 * Routes to PremiumWorkspace (tabbed: Dashboard View | AI Conversation)
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMediaStore }    from '../store/mediaStore';
import { HTML_TEMPLATES }   from '../constants/templates';
import PremiumWorkspace     from '../engine/PremiumWorkspace';
import DashboardHomepage    from './DashboardHomepage';

export default function Stage7Dashboard() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const store          = useMediaStore();

  const workflowId = searchParams.get('workflow_id') ?? store.workflowId;
  const lensId     = searchParams.get('lens')        ?? store.lensId;
  const dashId     = searchParams.get('dash');
  const brandName  = store.brandName;

  let template = store.selectedTemplate;
  if (!template) {
    template = HTML_TEMPLATES[Math.floor(Math.random() * HTML_TEMPLATES.length)];
    store.setSelectedTemplate(template);
  }

  const selectedDashboards = store.selectedDashboards ?? [];
  const isMulti = selectedDashboards.length > 1;

  if (!workflowId) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh', fontFamily:'DM Sans, system-ui, sans-serif' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ color:'#737888', marginBottom:14, fontSize:15 }}>No workflow found.</p>
          <button
            onClick={() => navigate('/media/upload')}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#5B5BD6,#818CF8)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            ← Start a new workflow
          </button>
        </div>
      </div>
    );
  }

  if (dashId) {
    const from    = searchParams.get('from');
    const wfParam = searchParams.get('wf');
    return (
      <PremiumWorkspace
        workflowId={workflowId}
        lensId={lensId}
        brandName={brandName}
        template={template}
        dashboardId={dashId}
        onBack={() => {
          if (from === 'workflows' && wfParam) navigate(`/workflows/${wfParam}`);
          else if (isMulti) navigate(`/media/dashboard?workflow_id=${workflowId}&lens=${lensId}`);
          else navigate(-1);
        }}
      />
    );
  }

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

  return (
    <PremiumWorkspace
      workflowId={workflowId}
      lensId={lensId}
      brandName={brandName}
      template={template}
      dashboardId={selectedDashboards[0] ?? 'intelligence'}
      onBack={() => navigate(-1)}
    />
  );
}
