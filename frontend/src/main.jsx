import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App          from './App.jsx';
import MediaApp     from './media/MediaApp.jsx';
import WorkflowsApp from './media/WorkflowsApp.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      {/* ── Workflows Hub ── */}
      <Route path="/workflows/*" element={<WorkflowsApp />} />

      {/* ── Media Intelligence Platform ── */}
      <Route path="/media/*" element={<MediaApp />} />

      {/* ── Original Agent Builder ── */}
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
