/**
 * Stage4Review — Tagged article review.
 * Full port of TaggedArticlesModal.tsx → JSX, adapted to our CSS variable system.
 * Data: GET/PUT /review/tagged?workflow_id=&lens_id=
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X, Newspaper, Loader2, Save, ChevronUp, ChevronDown,
  ChevronsUpDown, Pencil, RotateCcw, BarChart2,
} from 'lucide-react';
import { taggedArticlesApi } from '../api/client';
import { useMediaStore } from '../store/mediaStore';
import { ErrorBanner } from '../components/ErrorBanner';

// ── Primitives ────────────────────────────────────────────────────────────────

function SentimentBadge({ value }) {
  const map = {
    POS: { color: 'var(--mi-positive)', bg: 'var(--mi-positive-bg)' },
    NEU: { color: 'var(--mi-text-3)',   bg: 'var(--mi-surface-2)' },
    NEG: { color: 'var(--mi-negative)', bg: 'var(--mi-negative-bg)' },
  };
  const s = map[value] ?? map['NEU'];
  return (
    <span className="mi-sentiment-badge" style={{ color: s.color, background: s.bg }}>
      {value}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? 'var(--mi-positive)' : pct >= 50 ? 'var(--mi-warning)' : 'var(--mi-negative)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', background: 'var(--mi-surface-3)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: 'var(--mi-font-mono)', color, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function SeverityDot({ value }) {
  const colors = ['var(--mi-positive)', 'var(--mi-positive)', 'var(--mi-warning)', 'var(--mi-warning)', 'var(--mi-negative)'];
  const col = colors[(value ?? 1) - 1] ?? colors[0];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, fontSize: 11, fontWeight: 700, background: `${col}20`, color: col }}>
      {value}
    </span>
  );
}

function SortTh({ label, field, sortField, sortDir, onSort, style = {} }) {
  const active = field === sortField;
  return (
    <th className="mi-review-th" style={style}>
      {field ? (
        <button className="mi-sort-btn" onClick={() => onSort(field)} style={{ color: active ? 'var(--mi-text)' : 'var(--mi-text-3)' }}>
          {label}
          {active ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} style={{ opacity: 0.3 }} />}
        </button>
      ) : label}
    </th>
  );
}

// ── Inline row editor ─────────────────────────────────────────────────────────
function RowEditor({ article, onUpdate, onRevert, onClose }) {
  const cur = article.current;

  function TagField({ label, value = [], onChange }) {
    const [input, setInput] = useState('');
    return (
      <div className="mi-editor-field">
        <label className="mi-editor-label">{label}</label>
        <div className="mi-tag-input mi-tag-input--editor">
          {value.map((tag, i) => (
            <span key={i} className="mi-tag mi-tag--sm">
              {tag}
              <button type="button" className="mi-tag-remove" onClick={() => onChange(value.filter((_, j) => j !== i))}><X size={8} /></button>
            </span>
          ))}
          <input
            className="mi-tag-input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const t = input.trim().replace(/,+$/, ''); if (t && !value.includes(t)) onChange([...value, t]); setInput(''); }
              if (e.key === 'Backspace' && !input && value.length > 0) onChange(value.slice(0, -1));
            }}
            onBlur={() => { const t = input.trim(); if (t && !value.includes(t)) onChange([...value, t]); setInput(''); }}
            placeholder={value.length === 0 ? 'Type, press Enter…' : ''}
          />
        </div>
      </div>
    );
  }

  function Field({ label, children }) {
    return <div className="mi-editor-field"><label className="mi-editor-label">{label}</label>{children}</div>;
  }

  const inputStyle = { background: 'var(--mi-surface)', border: '1px solid var(--mi-border-md)', color: 'var(--mi-text)' };
  const inputCls = 'mi-editor-input';

  return (
    <tr className="mi-editor-row">
      <td colSpan={9}>
        <div className="mi-editor-body">
          {/* Publication */}
          <p className="mi-editor-section-title">Publication</p>
          <div className="mi-editor-grid mi-editor-grid--4">
            <Field label="Title"><input value={cur.title ?? ''} onChange={(e) => onUpdate('title', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Source"><input value={cur.source ?? ''} onChange={(e) => onUpdate('source', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Domain"><input value={cur.domain ?? ''} onChange={(e) => onUpdate('domain', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Date"><input value={cur.date ?? ''} onChange={(e) => onUpdate('date', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Author"><input value={cur.author ?? ''} onChange={(e) => onUpdate('author', e.target.value || null)} className={inputCls} style={inputStyle} /></Field>
            <Field label="URL"><input value={cur.url ?? ''} onChange={(e) => onUpdate('url', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Reach"><input type="number" value={cur.reach ?? 0} onChange={(e) => onUpdate('reach', Number(e.target.value))} className={inputCls} style={inputStyle} /></Field>
          </div>

          {/* Analysis */}
          <p className="mi-editor-section-title">Analysis</p>
          <div className="mi-editor-grid mi-editor-grid--4">
            <Field label="Sentiment">
              <div style={{ display: 'flex', gap: 5 }}>
                {['POS', 'NEU', 'NEG'].map((v) => {
                  const colors = { POS: 'var(--mi-positive)', NEU: 'var(--mi-text-3)', NEG: 'var(--mi-negative)' };
                  const active = cur.sentiment === v;
                  return (
                    <button key={v} type="button" className="mi-sentiment-btn" onClick={() => onUpdate('sentiment', v)}
                      style={active ? { background: `${colors[v]}18`, color: colors[v], borderColor: `${colors[v]}40` } : { background: 'transparent', color: 'var(--mi-text-3)', borderColor: 'var(--mi-border-md)' }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Theme"><input value={cur.theme ?? ''} onChange={(e) => onUpdate('theme', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Emotion"><input value={cur.emotion ?? ''} onChange={(e) => onUpdate('emotion', e.target.value)} className={inputCls} style={inputStyle} /></Field>
            <Field label="Severity (1–5)">
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map((n) => {
                  const cols = ['var(--mi-positive)', 'var(--mi-positive)', 'var(--mi-warning)', 'var(--mi-warning)', 'var(--mi-negative)'];
                  const active = cur.severity === n;
                  return (
                    <button key={n} type="button" className="mi-sev-btn" onClick={() => onUpdate('severity', n)}
                      style={active ? { background: cols[n-1], color: '#fff', borderColor: cols[n-1] } : { background: 'var(--mi-surface-2)', color: 'var(--mi-text-3)', borderColor: 'var(--mi-border)' }}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Confidence">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                <input type="range" min={0} max={1} step={0.01} value={cur.confidence ?? 0} onChange={(e) => onUpdate('confidence', parseFloat(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--mi-font-mono)', color: 'var(--mi-text-2)', minWidth: 32, textAlign: 'right' }}>{Math.round((cur.confidence ?? 0) * 100)}%</span>
              </div>
            </Field>
          </div>

          {/* Content */}
          <p className="mi-editor-section-title">Content</p>
          <div className="mi-editor-grid mi-editor-grid--2">
            <Field label="Article Content">
              <textarea value={cur.content ?? ''} onChange={(e) => onUpdate('content', e.target.value)} rows={4} className="mi-editor-textarea" style={inputStyle} />
            </Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Theme Reason">
                <textarea value={cur.xai_theme_reason ?? ''} onChange={(e) => onUpdate('xai_theme_reason', e.target.value)} rows={2} className="mi-editor-textarea" style={inputStyle} />
              </Field>
              <Field label="Sentiment Reason">
                <textarea value={cur.xai_sentiment_reason ?? ''} onChange={(e) => onUpdate('xai_sentiment_reason', e.target.value)} rows={2} className="mi-editor-textarea" style={inputStyle} />
              </Field>
            </div>
          </div>

          {/* Entities */}
          <p className="mi-editor-section-title">Entities</p>
          <div className="mi-editor-grid mi-editor-grid--3">
            <TagField label="Brands of Interest" value={cur.brand_of_interest ?? []} onChange={(v) => onUpdate('brand_of_interest', v)} />
            <TagField label="Competitors"         value={cur.competitors ?? []}       onChange={(v) => onUpdate('competitors', v)} />
            <TagField label="All Brands"          value={cur.all_brands ?? []}        onChange={(v) => onUpdate('all_brands', v)} />
            <TagField label="Message Keywords"    value={cur.message_keywords ?? []}  onChange={(v) => onUpdate('message_keywords', v)} />
          </div>

          {/* Footer */}
          <div className="mi-editor-footer">
            <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={onRevert}><RotateCcw size={11} /> Revert</button>
            <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={onClose}>Collapse</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Stage4Review() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId    = searchParams.get('workflow_id') ?? useMediaStore.getState().workflowId;
  const lensId        = searchParams.get('lens')        ?? useMediaStore.getState().lensId;
  const setArticlesUpdatedFlag = useMediaStore((s) => s.setArticlesUpdatedFlag);
  const setConfirmedData       = useMediaStore((s) => s.setConfirmedData);

  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [articles,       setArticles]       = useState([]);
  const [fetchError,     setFetchError]     = useState(null);
  const [expandedIndex,  setExpandedIndex]  = useState(null);
  const [sortField,      setSortField]      = useState('date');
  const [sortDir,        setSortDir]        = useState('desc');

  // Fetch on mount / workflowId change
  useEffect(() => {
    if (!workflowId) return;
    setLoading(true);
    setFetchError(null);
    taggedArticlesApi.get(workflowId, lensId)
      .then((rows) => setArticles(rows.map((r) => ({ original: r, current: { ...r } }))))
      .catch((e) => setFetchError(e instanceof Error ? e.message : 'Failed to load articles'))
      .finally(() => setLoading(false));
  }, [workflowId, lensId]);

  const isArticleDirty = (a) => JSON.stringify(a.current) !== JSON.stringify(a.original);
  const dirtyCount = articles.filter(isArticleDirty).length;

  function updateArticle(index, field, value) {
    setArticles((prev) => prev.map((a, i) => i === index ? { ...a, current: { ...a.current, [field]: value } } : a));
  }
  function revertArticle(index) {
    setArticles((prev) => prev.map((a, i) => i === index ? { ...a, current: { ...a.original } } : a));
  }
  function discardAll() {
    setArticles((prev) => prev.map((a) => ({ ...a, current: { ...a.original } })));
  }
  function handleSort(field) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setExpandedIndex(null);
  }

  const sortedIndices = [...articles.keys()].sort((ai, bi) => {
    const a = articles[ai].current;
    const b = articles[bi].current;
    let cmp = 0;
    switch (sortField) {
      case 'title':      cmp = (a.title ?? '').localeCompare(b.title ?? ''); break;
      case 'source':     cmp = (a.source ?? '').localeCompare(b.source ?? ''); break;
      case 'date':       cmp = (a.date ?? '').localeCompare(b.date ?? ''); break;
      case 'sentiment':  cmp = (a.sentiment ?? '').localeCompare(b.sentiment ?? ''); break;
      case 'severity':   cmp = (a.severity ?? 0) - (b.severity ?? 0); break;
      case 'confidence': cmp = (a.confidence ?? 0) - (b.confidence ?? 0); break;
      case 'theme':      cmp = (a.theme ?? '').localeCompare(b.theme ?? ''); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSave = useCallback(async () => {
    const changed = articles.filter(isArticleDirty);
    if (changed.length === 0) { alert('No changes to save'); return; }
    if (!lensId) { alert('Lens ID is required to update articles'); return; }
    setSaving(true);
    try {
      const payload = changed.map((a) => ({ ...a.current }));
      await taggedArticlesApi.update(workflowId, lensId, payload);
      setArticles((prev) => prev.map((a) => ({ ...a, original: { ...a.current } })));
      setArticlesUpdatedFlag(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update articles');
    } finally {
      setSaving(false);
    }
  }, [articles, workflowId, lensId]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  return (
    <div className="mi-stage mi-stage--review-full">
      {/* ── Header bar ──────────────────────────────────────────── */}
      <div className="mi-review-header">
        <div className="mi-review-header-left">
          <div className="mi-review-icon"><Newspaper size={14} /></div>
          <span className="mi-review-title">Tagged Articles</span>
          {!loading && !fetchError && (
            <span className="mi-review-count">{articles.length} articles</span>
          )}
          {dirtyCount > 0 && (
            <span className="mi-unsaved-badge">
              <span className="mi-unsaved-dot" />{dirtyCount} unsaved
            </span>
          )}
        </div>
        <div className="mi-review-header-right">
          {dirtyCount > 0 && (
            <>
              <button className="mi-btn mi-btn--ghost mi-btn--sm" onClick={discardAll}>Discard all</button>
              <button className="mi-btn mi-btn--primary mi-btn--sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={11} className="mi-spin" /> : <Save size={11} />}
                Save all
                <kbd className="mi-kbd">⌘S</kbd>
              </button>
            </>
          )}
          <button
            className="mi-btn mi-btn--outline mi-btn--sm"
            onClick={() => {
              // Save confirmed articles to store for template preview
              setConfirmedData(articles.map((a) => a.current));
              navigate(`/media/template-select?workflow_id=${workflowId}&lens=${lensId}`);
            }}
          >
            <BarChart2 size={13} /> Select Template &amp; Generate
          </button>
        </div>
      </div>

      <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); setLoading(true); taggedArticlesApi.get(workflowId, lensId).then((r) => setArticles(r.map((a) => ({ original: a, current: { ...a } })))).catch((e) => setFetchError(e.message)).finally(() => setLoading(false)); }} />

      {/* ── Body ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="mi-review-loading">
          <Loader2 size={20} className="mi-spin" style={{ color: 'var(--mi-primary)' }} />
          <span>Loading articles…</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="mi-review-empty">
          <div className="mi-review-empty-icon"><Newspaper size={24} /></div>
          <p className="mi-review-empty-title">No tagged articles yet</p>
          <p className="mi-review-empty-sub">Articles will appear here once the pipeline completes processing.</p>
        </div>
      ) : (
        <div className="mi-review-table-wrap">
          <table className="mi-review-table">
            <colgroup>
              <col />{/* dirty dot */}
              <col />{/* title */}
              <col />{/* source */}
              <col />{/* date */}
              <col />{/* sentiment */}
              <col />{/* theme */}
              <col />{/* severity */}
              <col />{/* confidence */}
              <col />{/* edit */}
            </colgroup>
            <thead className="mi-review-thead">
              <tr>
                <th className="mi-review-th" style={{ width: 28 }} />
                <SortTh label="Title"      field="title"      sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ minWidth: 220 }} />
                <SortTh label="Source"     field="source"     sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ width: 110 }} />
                <SortTh label="Date"       field="date"       sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ width: 96 }} />
                <SortTh label="Sentiment"  field="sentiment"  sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ width: 90 }} />
                <SortTh label="Theme"      field="theme"      sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ width: 130 }} />
                <SortTh label="Severity"   field="severity"   sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ width: 80 }} />
                <SortTh label="Confidence" field="confidence" sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ width: 130 }} />
                <th className="mi-review-th" style={{ width: 70, textAlign: 'right' }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {sortedIndices.map((origIndex) => {
                const article  = articles[origIndex];
                const dirty    = isArticleDirty(article);
                const expanded = expandedIndex === origIndex;
                const cur      = article.current;

                return (
                  <React.Fragment key={article.original.id ?? origIndex}>
                    <tr
                      className={`mi-review-row ${dirty ? 'mi-review-row--dirty' : ''} ${expanded ? 'mi-review-row--expanded' : ''}`}
                    >
                      <td className="mi-review-td" style={{ width: 28 }}>
                        {dirty && <span className="mi-dirty-dot" title="Unsaved changes" />}
                      </td>
                      <td className="mi-review-td">
                        <p className="mi-review-title-cell" title={cur.title}>{cur.title || 'Untitled'}</p>
                        {cur.domain && <p className="mi-review-domain">{cur.domain}</p>}
                      </td>
                      <td className="mi-review-td mi-review-td--secondary">{cur.source}</td>
                      <td className="mi-review-td mi-review-td--mono">{cur.date ? cur.date.slice(0, 10) : '—'}</td>
                      <td className="mi-review-td"><SentimentBadge value={cur.sentiment} /></td>
                      <td className="mi-review-td mi-review-td--secondary mi-truncate" title={cur.theme}>{cur.theme || '—'}</td>
                      <td className="mi-review-td"><SeverityDot value={cur.severity} /></td>
                      <td className="mi-review-td"><ConfidenceBar value={cur.confidence ?? 0} /></td>
                      <td className="mi-review-td" style={{ textAlign: 'right' }}>
                        <button
                          className={`mi-edit-btn ${expanded ? 'mi-edit-btn--active' : ''}`}
                          onClick={() => setExpandedIndex(expanded ? null : origIndex)}
                        >
                          <Pencil size={11} />{expanded ? 'Close' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <RowEditor
                        key={`editor-${article.original.id ?? origIndex}`}
                        article={article}
                        onUpdate={(field, value) => updateArticle(origIndex, field, value)}
                        onRevert={() => revertArticle(origIndex)}
                        onClose={() => setExpandedIndex(null)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
