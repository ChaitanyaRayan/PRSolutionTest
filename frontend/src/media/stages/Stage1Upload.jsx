import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';
import { useMediaStore } from '../store/mediaStore';

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  },
};

export default function Stage1Upload() {
  const navigate  = useNavigate();
  const inputRef  = useRef(null);
  const setFileData     = useMediaStore((s) => s.setFileData);
  const setBrandKeywords = useMediaStore((s) => s.setBrandKeywords);
  const storedKeywords  = useMediaStore((s) => s.brandKeywords);

  const { file, headers, preview, parsedData, error, isDragging, onDrop, onDragOver, onDragLeave, onFileSelect, reset } =
    useFileUpload();

  // Tag input state
  const [keywords, setKeywords]     = useState(storedKeywords);
  const [kwInput,  setKwInput]      = useState('');

  const addKeyword = useCallback((raw) => {
    const tag = raw.trim().replace(/,+$/, '');
    if (tag && !keywords.includes(tag)) setKeywords((k) => [...k, tag]);
    setKwInput('');
  }, [keywords]);

  const removeKeyword = useCallback((tag) => {
    setKeywords((k) => k.filter((t) => t !== tag));
  }, []);

  function handleContinue() {
    setFileData(file, headers, preview, parsedData);
    setBrandKeywords(keywords);
    navigate('/media/configure');
  }

  const previewCols = headers.slice(0, 6);
  const previewRows = preview.slice(0, 6);

  return (
    <div className="mi-stage mi-stage--upload">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        className="mi-stage-header"
        variants={stagger.container}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={stagger.item} className="mi-stage-eyebrow">
          <span className="mi-step-badge">01</span>
          <span>Data Ingestion</span>
        </motion.div>
        <motion.h1 variants={stagger.item} className="mi-stage-title">
          Upload your dataset
        </motion.h1>
        <motion.p variants={stagger.item} className="mi-stage-subtitle">
          CSV or Excel files up to 50 MB. We parse headers and preview locally — nothing is sent until you confirm.
        </motion.p>
      </motion.div>

      {/* ── Drop Zone / Preview ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            className={`mi-dropzone ${isDragging ? 'mi-dropzone--active' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileSelect} style={{ display: 'none' }} aria-hidden />
            <motion.div
              className="mi-dropzone-icon"
              animate={isDragging ? { scale: 1.15 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <UploadIcon />
            </motion.div>
            <p className="mi-dropzone-primary">{isDragging ? 'Drop to upload' : 'Drag & drop your file here'}</p>
            <p className="mi-dropzone-secondary">or click to browse — CSV or XLSX only</p>
            <div className="mi-dropzone-formats">
              <span className="mi-format-chip">CSV</span>
              <span className="mi-format-chip">XLSX</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            className="mi-file-preview"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mi-file-meta">
              <div className="mi-file-icon"><FileIcon /></div>
              <div className="mi-file-info">
                <span className="mi-file-name">{file.name}</span>
                <span className="mi-file-size">{formatBytes(file.size)} · {parsedData.length.toLocaleString()} rows · {headers.length} columns</span>
              </div>
              <button className="mi-file-remove" onClick={reset} aria-label="Remove file"><X size={15} /></button>
            </div>
            <div className="mi-column-chips">
              {headers.slice(0, 10).map((h) => <span key={h} className="mi-col-chip">{h}</span>)}
              {headers.length > 10 && <span className="mi-col-chip mi-col-chip--more">+{headers.length - 10} more</span>}
            </div>
            <div className="mi-preview-table-wrap">
              <table className="mi-preview-table">
                <thead>
                  <tr>
                    {previewCols.map((h) => <th key={h}>{h}</th>)}
                    {headers.length > 6 && <th className="mi-col-ellipsis">…</th>}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {previewCols.map((h) => <td key={h} title={String(row[h] ?? '')}>{truncate(String(row[h] ?? ''), 30)}</td>)}
                      {headers.length > 6 && <td className="mi-col-ellipsis">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 6 && <p className="mi-preview-caption">Showing 6 of {parsedData.length.toLocaleString()} rows</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline error ─────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div className="mi-error-banner" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <span className="mi-error-icon">⚠</span><span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Brand keywords ───────────────────────────────────────── */}
      <motion.div
        className="mi-field-block"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="mi-label" htmlFor="brand-kw">
          Brand keywords
          <span className="mi-label-hint">Used to identify relevant articles during analysis</span>
        </label>
        <div className={`mi-tag-input ${keywords.length === 0 && kwInput === '' ? '' : 'mi-tag-input--has-content'}`}>
          {keywords.map((tag) => (
            <span key={tag} className="mi-tag">
              {tag}
              <button type="button" className="mi-tag-remove" onClick={() => removeKeyword(tag)} aria-label={`Remove ${tag}`}>
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            id="brand-kw"
            className="mi-tag-input-field"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(kwInput); }
              if (e.key === 'Backspace' && !kwInput && keywords.length > 0) setKeywords((k) => k.slice(0, -1));
            }}
            onBlur={() => kwInput.trim() && addKeyword(kwInput)}
            placeholder={keywords.length === 0 ? 'Type brand name, press Enter…' : ''}
          />
        </div>
        <p className="mi-field-hint">e.g. "AARP", "American Association" — press Enter or comma after each</p>
      </motion.div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <motion.div className="mi-stage-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <motion.button
          className="mi-btn mi-btn--primary"
          onClick={handleContinue}
          disabled={!file}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue to Dashboard Configuration
          <ArrowRightIcon />
        </motion.button>
      </motion.div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function truncate(str, len) { return str.length > len ? str.slice(0, len) + '…' : str; }

function UploadIcon() {
  return <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="12" fill="currentColor" fillOpacity="0.08"/><path d="M20 26V18M20 18L16 22M20 18L24 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 28h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function FileIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 3h9l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function ArrowRightIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
