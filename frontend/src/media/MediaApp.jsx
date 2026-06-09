import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandThemeProvider }    from './context/BrandThemeContext';
import Stage1Upload              from './stages/Stage1Upload';
import Stage2Configure           from './stages/Stage2Configure';
import Stage3Launch              from './stages/Stage3Launch';
import Stage7Dashboard           from './stages/Stage7Dashboard';
import { useMediaStore }         from './store/mediaStore';
import { useDropdowns }          from './hooks/useDropdowns';
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

// ── Progress stepper ──────────────────────────────────────────────────────────
// Streamlined to 4 steps — template is auto-selected at launch, no separate review/template stages
const STEPS = [
  { path: '/media/upload',    label: 'Upload',    num: '01' },
  { path: '/media/configure', label: 'Configure', num: '02' },
  { path: '/media/launch',    label: 'Launch',    num: '03' },
  { path: '/media/dashboard', label: 'Dashboard', num: '04' },
];

function MediaStepper() {
  const location    = useLocation();
  const isDashboard = location.pathname.startsWith('/media/dashboard');

  if (isDashboard) return null;   // full-screen dashboard hides the stepper

  const currentIdx = STEPS.findIndex((s) => location.pathname.startsWith(s.path));

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
                  i < currentIdx  ? 'mi-stepper-step--done'   :
                  i === currentIdx ? 'mi-stepper-step--active' :
                                     'mi-stepper-step--pending'
                }`}
              >
                <span className="mi-stepper-num">
                  {i < currentIdx ? <CheckMiniIcon /> : step.num}
                </span>
                <span className="mi-stepper-label">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mi-stepper-connector ${i < currentIdx ? 'mi-stepper-connector--done' : ''}`} />
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
  useDropdowns();

  return (
    <BrandThemeProvider>
      <div className="mi-app">
        <MediaStepper />
        <main className="mi-main">
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
                <Route path="upload"    element={<Stage1Upload />} />
                <Route path="configure" element={<RequireFile><Stage2Configure /></RequireFile>} />
                <Route path="launch"    element={<RequireDashboards><Stage3Launch /></RequireDashboards>} />

                {/* Keep legacy routes active so saved workflow links still work */}
                <Route path="review"           element={<Navigate to="/media/dashboard" replace />} />
                <Route path="template-select"  element={<Navigate to="/media/dashboard" replace />} />
                <Route path="template-preview" element={<Navigate to="/media/dashboard" replace />} />

                {/* Dashboard */}
                <Route path="dashboard"          element={<Stage7Dashboard />} />
                <Route path="dashboard/lens/:id" element={<Stage7Dashboard />} />

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
