import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import WorkflowsPage     from './stages/WorkflowsPage';
import WorkflowDetailPage from './stages/WorkflowDetailPage';
import './media.css';

function WorkflowsNav() {
  return (
    <nav className="mi-stepper" aria-label="Workflows navigation">
      <div className="mi-stepper-inner">
        <Link to="/workflows" className="mi-stepper-brand">
          <span className="mi-stepper-logo">◈</span>
          <span className="mi-stepper-product">Media Intelligence</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/media/upload" style={{ textDecoration: 'none' }}>
            <button className="mi-btn mi-btn--ghost mi-btn--sm">+ New Workflow</button>
          </Link>
        </div>
        <div style={{ width: 140 }} />
      </div>
    </nav>
  );
}

export default function WorkflowsApp() {
  const location = useLocation();

  return (
    <div className="mi-app">
      <WorkflowsNav />
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
              <Route index element={<WorkflowsPage />} />
              <Route path=":workflowId" element={<WorkflowDetailPage />} />
              <Route path="*" element={<Navigate to="/workflows" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
