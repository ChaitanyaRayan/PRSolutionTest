import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './LeftPanel.css';

const TABS = ['Data', 'Instructions', 'Settings'];

const tabVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, x: 8,  transition: { duration: 0.15 } },
};

export default function LeftPanel({
  agentName, setAgentName,
  instructions, setInstructions,
  fileContext, setFileContext,
  uploadedFiles, setUploadedFiles,
}) {
  const [activeTab, setActiveTab] = useState('Data');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFiles(files) {
    if (!files.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      const newFiles = data.files || [];
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      const allContext = [...uploadedFiles, ...newFiles]
        .map((f) => `=== ${f.name} ===\n${f.content}`)
        .join('\n\n');
      setFileContext(allContext);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function removeFile(name) {
    const remaining = uploadedFiles.filter((f) => f.name !== name);
    setUploadedFiles(remaining);
    setFileContext(remaining.map((f) => `=== ${f.name} ===\n${f.content}`).join('\n\n'));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <aside className={`left-panel ${collapsed ? 'left-panel--collapsed' : ''}`}>
      <div className="left-panel-tabs">
        <AnimatePresence>
          {!collapsed && TABS.map((tab) => (
            <motion.button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {tab}
            </motion.button>
          ))}
        </AnimatePresence>
        <button
          className="tab-collapse-btn"
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
          onClick={() => setCollapsed((c) => !c)}
        >
          <CollapseIcon flipped={collapsed} />
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="left-panel-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'Data' && (
                <motion.div key="data" className="tab-pane" {...tabVariants}>
                  <p className="section-label">Agent Name</p>
                  <input
                    className="text-input"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Competitor Analysis"
                  />

                  <p className="section-label" style={{ marginTop: 20 }}>Data Sources</p>

                  {uploadedFiles.length > 0 && (
                    <ul className="file-list">
                      {uploadedFiles.map((f) => (
                        <li key={f.name} className="file-item">
                          <FileIcon />
                          <span className="file-name">{f.name}</span>
                          <span className="file-size">{formatSize(f.size)}</span>
                          <button className="file-remove" onClick={() => removeFile(f.name)}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div
                    className={`drop-zone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <span className="drop-uploading">Uploading…</span>
                    ) : (
                      <>
                        <div className="drop-icon">
                          <DatabaseIcon />
                        </div>
                        <p className="drop-title">Add data source</p>
                        <p className="drop-sub">Drop files or click to upload</p>
                        <p className="drop-hint">.xlsx, .csv, .json, .txt supported</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json,.txt,.md"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </motion.div>
              )}

              {activeTab === 'Instructions' && (
                <motion.div key="instructions" className="tab-pane" {...tabVariants}>
                  <p className="section-label">System Instructions</p>
                  <p className="section-hint">
                    Tell the agent how to behave, what to focus on, and how to present data.
                  </p>
                  <textarea
                    className="instructions-textarea"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={
                      'Example:\n' +
                      'You are a competitive intelligence analyst. When analyzing data, always:\n' +
                      '- Show comparison tables\n' +
                      '- Highlight pricing differences\n' +
                      '- Provide actionable recommendations'
                    }
                    rows={16}
                  />
                </motion.div>
              )}

              {activeTab === 'Settings' && (
                <motion.div key="settings" className="tab-pane" {...tabVariants}>
                  <p className="section-label">Model</p>
                  <select className="select-input">
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (default)</option>
                    <option value="claude-opus-4-7">Claude Opus 4.7</option>
                    <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                  </select>

                  <p className="section-label" style={{ marginTop: 20 }}>Response Style</p>
                  <select className="select-input">
                    <option>Rich UI (charts, tables, cards)</option>
                    <option>Plain text</option>
                  </select>

                  <p className="section-label" style={{ marginTop: 20 }}>Max tokens</p>
                  <input className="text-input" type="number" defaultValue={8096} min={256} max={32000} />

                  <div className="settings-info">
                    <InfoIcon />
                    <span>Changes apply to new conversations only.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function DatabaseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.657-4.03 3-9 3S3 13.657 3 12"/>
      <path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z"/>
      <path d="M9 1v5h5"/>
    </svg>
  );
}
function CollapseIcon({ flipped }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"
      style={{ transform: flipped ? 'scaleX(-1)' : 'none', transition: 'transform 0.25s ease' }}
    >
      <path d="M6 2L2 7l4 5M12 2l-4 5 4 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="7"/>
      <path d="M8 7v5M8 5v.5" strokeLinecap="round"/>
    </svg>
  );
}
