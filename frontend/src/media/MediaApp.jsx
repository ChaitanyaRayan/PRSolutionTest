import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandThemeProvider }    from './context/BrandThemeContext';
import Stage1Upload              from './stages/Stage1Upload';
import Stage2Configure           from './stages/Stage2Configure';
import Stage3Launch              from './stages/Stage3Launch';
import Stage4Review              from './stages/Stage4Review';
import Stage5TemplateSelect      from './stages/Stage5TemplateSelect';
import Stage6TemplatePreview     from './stages/Stage6TemplatePreview';
import Stage7Dashboard           from './stages/Stage7Dashboard';
import { useMediaStore }         from './store/mediaStore';
import './media.css';

// ── Route guards ──────────────────────────────────────────────────────────────
function RequireFile({ children }) {
  const file = useMediaStore((s) => s.file);
  return file ? children : <Navigate to="/media/upload" replace />;
}
function RequireDashboards({ children }) {
  const ids = useMediaStore((s) => s.selectedDashboards);
  return ids?.length > 0 ? children : <Navigate to="/media/configure" replace />;
}
function RequireWorkflow({ children }) {
  const id = useMediaStore((s) => s.workflowId);
  return id ? children : <Navigate to="/media/launch" replace />;
}
function RequireTemplate({ children }) {
  const tpl = useMediaStore((s) => s.selectedTemplate);
  return tpl ? children : <Navigate to="/media/template-select" replace />;
}

// ── Progress stepper ──────────────────────────────────────────────────────────
const STEPS = [
  { path: '/media/upload',           label: 'Upload',    num: '01' },
  { path: '/media/configure',        label: 'Configure', num: '02' },
  { path: '/media/launch',           label: 'Launch',    num: '03' },
  { path: '/media/review',           label: 'Review',    num: '04' },
  { path: '/media/template-select',  label: 'Template',  num: '05' },
  { path: '/media/dashboard',        label: 'Dashboard', num: '06' },
];

function MediaStepper() {
  const location   = useLocation();
  const isDashboard = location.pathname.startsWith('/media/dashboard');

  // On the dashboard route, hide the stepper entirely (full-screen experience)
  if (isDashboard) return null;

  const currentIdx = STEPS.findIndex((s) => location.pathname.startsWith(s.path));
  // template-preview maps to step 05
  const effectiveIdx = location.pathname.startsWith('/media/template-preview')
    ? STEPS.findIndex((s) => s.path === '/media/template-select')
    : currentIdx;

  return (
    <nav className="mi-stepper" aria-label="Progress">
      <div className="mi-stepper-inner">
        <Link to="/media/upload" className="mi-stepper-brand">
          <span className="mi-stepper-logo">◈</span>
          <span className="mi-stepper-product">Media Intelligence</span>
        </Link>
        <div className="mi-stepper-steps">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.path}>
              <div
                className={`mi-stepper-step ${
                  i < effectiveIdx  ? 'mi-stepper-step--done'   :
                  i === effectiveIdx ? 'mi-stepper-step--active' :
                                       'mi-stepper-step--pending'
                }`}
              >
                <span className="mi-stepper-num">
                  {i < effectiveIdx ? <CheckMiniIcon /> : step.num}
                </span>
                <span className="mi-stepper-label">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mi-stepper-connector ${i < effectiveIdx ? 'mi-stepper-connector--done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ width: 140 }} />
      </div>
    </nav>
  );
}

// ── MediaApp ──────────────────────────────────────────────────────────────────
export default function MediaApp() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/media/dashboard');

  return (
    <BrandThemeProvider>
      <div className={`mi-app ${isDashboard ? 'mi-app--fullscreen' : ''}`}>
        <MediaStepper />
        <main className={`mi-main ${isDashboard ? 'mi-main--fullscreen' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ height: '100%' }}
            >
              <Routes location={location}>
                {/* Core workflow stages */}
                <Route path="upload"    element={<Stage1Upload />} />
                <Route path="configure" element={<RequireFile><Stage2Configure /></RequireFile>} />
                <Route path="launch"    element={<RequireDashboards><Stage3Launch /></RequireDashboards>} />
                <Route path="review"    element={<Stage4Review />} />

                {/* Template stages — after review */}
                <Route path="template-select"
                  element={<RequireWorkflow><Stage5TemplateSelect /></RequireWorkflow>} />
                <Route path="template-preview"
                  element={<RequireTemplate><Stage6TemplatePreview /></RequireTemplate>} />

                {/* Dashboard — single, multi-homepage, or specific lens */}
                <Route path="dashboard"           element={<Stage7Dashboard />} />
                <Route path="dashboard/lens/:id"  element={<Stage7Dashboard />} />

                <Route path="*" element={<Navigate to="upload" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </BrandThemeProvider>
  );
}

function CheckMiniIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
