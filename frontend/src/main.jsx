import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@openuidev/react-ui';
import '@openuidev/react-ui/components.css';
import App from './App.jsx';
import MediaApp     from './media/MediaApp.jsx';
import WorkflowsApp from './media/WorkflowsApp.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ThemeProvider mode="dark">
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
  </ThemeProvider>
);
