/**
 * TemplateDashboard — Renders the selected HTML template with real API data.
 *
 * Architecture:
 *  1. Calls GET /api/template/render?template_id=&workflow_id=&lens_id=
 *     Backend: reads template HTML → fetches chart data → AI generates injection
 *             script → returns complete HTML with data injected
 *  2. Renders the HTML in a full-page <iframe> so the template's own CSS,
 *     fonts, Chart.js, and layout are fully preserved — pixel-perfect
 *  3. Overlays a React toolbar (template switcher, chat toggle, page nav)
 *     so the user can switch templates and chat without leaving the view
 *  4. Two-way postMessage API between iframe and React:
 *     - Template → parent: PAGE_CHANGED, TEMPLATE_READY
 *     - Parent → template: GO_PAGE, PING
 *
 * This replaces the fixed-layout DashboardEngine for template-based dashboards.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, MessageSquare, X, ChevronLeft, ChevronRight,
  RefreshCw, Download, Share2, Sparkles, Send, ArrowLeft,
} from 'lucide-react';
import { useMediaStore }   from '../store/mediaStore';
import { HTML_TEMPLATES }  from '../constants/templates';
import { useDashboardChat } from '../hooks/useDashboardConfig';
import TemplateSwitcher    from '../components/TemplateSwitcher';

export default function TemplateDashboard({ workflowId, lensId, brandName, onBack }) {
  const store           = useMediaStore();
  const currentTemplate = store.selectedTemplate ?? HTML_TEMPLATES[0];

  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [chatOpen,    setChatOpen]    = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [generating,  setGenerating]  = useState(false);

  const iframeRef  = useRef(null);
  const iframeKey  = useRef(0);   // bump to force reload
  const [iKey,     setIKey]     = useState(0);

  const { messages, thinking, sendMessage } = useDashboardChat(workflowId, lensId, () => {});

  // ── Build the src URL ──────────────────────────────────────────────────────
  const templateId = currentTemplate?.id ?? 'template_02';
  const src = `/api/template/render?template_id=${templateId}&workflow_id=${encodeURIComponent(workflowId ?? '')}&lens_id=${encodeURIComponent(lensId ?? '')}`;

  // ── Listen for postMessage from iframe ─────────────────────────────────────
  useEffect(() => {
    function onMsg(e) {
      if (!e.data?.type) return;
      if (e.data.type === 'PAGE_CHANGED')  setCurrentPage(e.data.page);
      if (e.data.type === 'TEMPLATE_READY') setTotalPages(e.data.totalPages || 1);
      if (e.data.type === 'PONG')          setTotalPages(e.data.totalPages || 1);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ── Ping iframe after it loads ─────────────────────────────────────────────
  const pingIframe = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'PING' }, '*');
  }, []);

  // ── Navigate template pages ────────────────────────────────────────────────
  function goPage(n) {
    if (n < 1 || n > totalPages) return;
    iframeRef.current?.contentWindow?.postMessage({ type: 'GO_PAGE', page: n }, '*');
    setCurrentPage(n);
  }

  // ── Template switch ────────────────────────────────────────────────────────
  async function handleTemplateChange(newTpl) {
    setGenerating(true);
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    // Bump key to force iframe remount
    iframeKey.current += 1;
    setIKey(iframeKey.current);
    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 300));
    setGenerating(false);
  }

  // ── Reload / force regenerate ──────────────────────────────────────────────
  function forceReload() {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    iframeKey.current += 1;
    setIKey(iframeKey.current);
  }

  return (
    <div className="tdb-root">

      {/* ── Full-screen iframe ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {(loading || generating) && (
          <motion.div
            className="tdb-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="tdb-loading-inner">
              <div className="tdb-loading-logo" style={{ color: currentTemplate?.primaryColor ?? '#7C3AED' }}>
                ◈
              </div>
              <Loader2 size={28} className="mi-spin" style={{ color: currentTemplate?.primaryColor ?? '#7C3AED' }} />
              <p className="tdb-loading-label">
                {generating ? `Switching to ${currentTemplate?.name}…` : 'Loading intelligence dashboard…'}
              </p>
              <p className="tdb-loading-sub">AI is mapping your data to the template</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <iframe
        key={`${templateId}-${iKey}`}
        ref={iframeRef}
        className={`tdb-iframe ${loading ? 'tdb-iframe--hidden' : ''}`}
        src={src}
        title={`${currentTemplate?.name ?? 'Dashboard'} — ${brandName}`}
        onLoad={() => { setLoading(false); setTimeout(pingIframe, 500); }}
        onError={() => { setLoading(false); setError('Failed to load template'); }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        allow="autoplay"
      />

      {error && (
        <div className="tdb-error">
          <p>Could not load the template: {error}</p>
          <button className="tdb-reload-btn" onClick={forceReload}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}

      {/* ── React overlay toolbar ───────────────────────────────────────────── */}
      {!error && (
        <div className="tdb-toolbar">
          {/* Left: Back + Brand */}
          <div className="tdb-toolbar-left">
            {onBack && (
              <button className="tdb-back-btn" onClick={onBack}>
                <ArrowLeft size={14} />
              </button>
            )}
            {brandName && (
              <span className="tdb-brand-chip">
                <span className="tdb-brand-dot" style={{ background: currentTemplate?.primaryColor ?? '#7C3AED' }} />
                {brandName}
              </span>
            )}
          </div>

          {/* Center: Page navigation */}
          {totalPages > 1 && (
            <div className="tdb-page-nav">
              <button className="tdb-nav-btn" onClick={() => goPage(currentPage - 1)} disabled={currentPage <= 1}>
                <ChevronLeft size={14} />
              </button>
              <div className="tdb-page-dots">
                {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
                  <button
                    key={i}
                    className={`tdb-page-dot ${i + 1 === currentPage ? 'tdb-page-dot--active' : ''}`}
                    style={i + 1 === currentPage ? { background: currentTemplate?.primaryColor } : {}}
                    onClick={() => goPage(i + 1)}
                  />
                ))}
              </div>
              <button className="tdb-nav-btn" onClick={() => goPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                <ChevronRight size={14} />
              </button>
              <span className="tdb-page-counter">{currentPage} / {totalPages}</span>
            </div>
          )}

          {/* Right: Template switcher + actions */}
          <div className="tdb-toolbar-right">
            <TemplateSwitcher onTemplateChange={handleTemplateChange} compact />
            <button className="tdb-action-btn" onClick={forceReload} title="Regenerate with fresh data">
              <RefreshCw size={14} />
            </button>
            <button
              className={`tdb-chat-toggle ${chatOpen ? 'tdb-chat-toggle--active' : ''}`}
              onClick={() => setChatOpen((o) => !o)}
              style={chatOpen ? { background: currentTemplate?.primaryColor, color: '#fff' } : {}}
            >
              <Sparkles size={14} />
              Ask AI
            </button>
          </div>
        </div>
      )}

      {/* ── AI Chat sidebar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="tdb-chat-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Chat header */}
            <div className="tdb-chat-header" style={{ borderBottomColor: `${currentTemplate?.primaryColor}25` }}>
              <div className="tdb-chat-header-left">
                <div className="tdb-chat-icon" style={{ background: `${currentTemplate?.primaryColor}18` }}>
                  <Sparkles size={14} style={{ color: currentTemplate?.primaryColor }} />
                </div>
                <div>
                  <p className="tdb-chat-title">Dashboard Intelligence</p>
                  <p className="tdb-chat-sub">Ask about your data</p>
                </div>
              </div>
              <button className="tdb-chat-close" onClick={() => setChatOpen(false)}>
                <X size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="tdb-chat-messages">
              {messages.length === 0 && (
                <div className="tdb-chat-empty">
                  <Sparkles size={24} style={{ color: currentTemplate?.primaryColor, opacity: 0.5 }} />
                  <p>Ask me anything about the data in this dashboard</p>
                  <div className="tdb-chat-starters">
                    {[
                      'What are the key insights?',
                      'Which theme drives most coverage?',
                      'Summarise sentiment trends',
                      'Create an executive summary',
                    ].map((q) => (
                      <button key={q} className="tdb-chat-starter"
                        style={{ borderColor: `${currentTemplate?.primaryColor}30` }}
                        onClick={() => sendMessage(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`tdb-msg tdb-msg--${msg.role}`}>
                  <div className="tdb-msg-bubble"
                    style={msg.role === 'user'
                      ? { background: `${currentTemplate?.primaryColor}15` }
                      : {}}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="tdb-msg tdb-msg--assistant">
                  <div className="tdb-msg-bubble tdb-msg-bubble--thinking">
                    <span className="co-thinking-dot" /><span className="co-thinking-dot" /><span className="co-thinking-dot" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <ChatInput onSend={sendMessage} disabled={thinking} primaryColor={currentTemplate?.primaryColor} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat input ────────────────────────────────────────────────────────────────
function ChatInput({ onSend, disabled, primaryColor }) {
  const [val, setVal] = useState('');
  function submit() {
    const t = val.trim();
    if (!t || disabled) return;
    onSend(t);
    setVal('');
  }
  return (
    <div className="tdb-chat-input-area">
      <input
        className="tdb-chat-input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
        placeholder="Ask about the data…"
        disabled={disabled}
      />
      <button
        className="tdb-chat-send"
        onClick={submit}
        disabled={!val.trim() || disabled}
        style={{ background: primaryColor ?? '#7C3AED' }}
      >
        {disabled ? <Loader2 size={14} className="mi-spin" /> : <Send size={14} />}
      </button>
    </div>
  );
}
