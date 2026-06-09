import React, { useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import TemplateSwitcher from './TemplateSwitcher';

const PERIOD_OPTIONS = ['Day', 'Week', 'Month', 'Quarter', 'Custom'];

export default function ProjectSettingsPanel({ workflowId, lensId, template, dashboards = [], onTemplateChange }) {
  const [period,     setPeriod]     = useState('Week');
  const [videoUrl,   setVideoUrl]   = useState(template?.backgroundVideoUrl ?? '');
  const [promptDash, setPromptDash] = useState(dashboards[0]?.id ?? '');

  return (
    <div className="psp-root">

      {/* ── TEMPLATE ──────────────────────────────────────────── */}
      <section className="psp-section">
        <span className="psp-section-label">TEMPLATE</span>
        <p className="psp-section-desc">Switch the visual style. Content is preserved — only the design changes.</p>
        <TemplateSwitcher onTemplateChange={onTemplateChange} />
      </section>

      {/* ── TIMELINE ──────────────────────────────────────────── */}
      <section className="psp-section">
        <span className="psp-section-label">TIMELINE</span>
        <p className="psp-section-desc">Default period shown in the dashboard</p>
        <div className="psp-period-group">
          {PERIOD_OPTIONS.map((p) => (
            <button key={p}
              className={`psp-period-btn ${period === p ? 'psp-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* ── DASHBOARDS ───────────────────────────────────────── */}
      <section className="psp-section">
        <span className="psp-section-label">DASHBOARDS</span>
        <p className="psp-section-desc">Drag to reorder · click × to remove</p>
        <div className="psp-dash-list">
          {dashboards.map((d) => (
            <div key={d.id} className="psp-dash-item">
              <GripVertical size={13} className="psp-dash-grip" />
              <span className="psp-dash-dot" style={{ background: d.tint ?? '#7C3AED' }} />
              <span className="psp-dash-name">{d.name}</span>
              <button className="psp-dash-remove"><X size={11} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* ── BACKGROUND VIDEO ──────────────────────────────────── */}
      <section className="psp-section">
        <span className="psp-section-label">BACKGROUND VIDEO</span>
        <p className="psp-section-desc">Paste a direct video URL (.mp4). Leave blank to use the default.</p>
        <input className="psp-input" value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
        {videoUrl && (
          <button className="psp-link-btn" onClick={() => setVideoUrl('')}>↺ Reset to default video</button>
        )}
      </section>

      {/* ── DATA SOURCES ──────────────────────────────────────── */}
      <section className="psp-section">
        <span className="psp-section-label">DATA SOURCES</span>
        <p className="psp-section-desc">Agents use data from these sources</p>
        <p className="psp-muted">No files uploaded yet</p>
        <p className="psp-muted">Data sources can only be edited from the home screen</p>
      </section>

      {/* ── DASHBOARD PROMPT ──────────────────────────────────── */}
      <section className="psp-section">
        <span className="psp-section-label">DASHBOARD PROMPT</span>
        <p className="psp-section-desc">Add custom instructions per agent</p>
        {dashboards.length > 0 && (
          <select className="psp-select" value={promptDash}
            onChange={(e) => setPromptDash(e.target.value)}>
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
        <textarea className="psp-textarea"
          placeholder="Define your primary brand, competitors, time period…" rows={4} />
      </section>
    </div>
  );
}
