/**
 * DashboardChat — Conversational AI agent sidebar.
 * Users type natural language; AI modifies the dashboard configuration.
 *
 * Example prompts:
 *   "Change the theme to match Nike branding"
 *   "Add a sentiment trend chart"
 *   "Make this more executive-friendly"
 *   "Use a dark theme"
 *   "Add competitor benchmarking section"
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'Add a sentiment trend chart',
  'Make the dashboard more executive-friendly',
  'Change to a dark theme',
  'Add competitor benchmarking section',
  'Move the top KPIs to the first tab',
  'Change chart colors to match the brand',
  'Add an emerging trends section',
  'Simplify the layout',
];

export function DashboardChat({ messages, thinking, onSend, onClose, theme }) {
  const [input, setInput]     = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    onSend(text);
  }

  const primary = theme?.primaryColor ?? '#7C3AED';

  return (
    <motion.div
      className="eng-chat-panel"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="eng-chat-header" style={{ borderBottomColor: `${primary}20` }}>
        <div className="eng-chat-header-left">
          <div className="eng-chat-icon" style={{ background: `${primary}18` }}>
            <Sparkles size={14} style={{ color: primary }} />
          </div>
          <div>
            <span className="eng-chat-title">Dashboard Agent</span>
            <span className="eng-chat-subtitle">Modify via conversation</span>
          </div>
        </div>
        <button className="mi-btn-icon" onClick={onClose}><X size={16} /></button>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="eng-chat-messages">
        {messages.length === 0 && (
          <div className="eng-chat-welcome">
            <div className="eng-chat-welcome-icon" style={{ background: `${primary}15` }}>
              <Sparkles size={20} style={{ color: primary }} />
            </div>
            <p className="eng-chat-welcome-title">How can I improve your dashboard?</p>
            <p className="eng-chat-welcome-sub">Ask me to modify layouts, charts, themes, or add new sections.</p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            className={`eng-chat-msg eng-chat-msg--${msg.role}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {msg.role === 'assistant' && (
              <div className="eng-chat-msg-icon" style={{ background: `${primary}18` }}>
                <Sparkles size={10} style={{ color: primary }} />
              </div>
            )}
            <div className={`eng-chat-bubble ${msg.error ? 'eng-chat-bubble--error' : ''}`}
              style={msg.role === 'user' ? { background: `${primary}18`, color: theme?.textColor } : {}}>
              {msg.content}
              {msg.changesApplied > 0 && (
                <span className="eng-chat-changes-badge">{msg.changesApplied} change{msg.changesApplied !== 1 ? 's' : ''} applied</span>
              )}
            </div>
          </motion.div>
        ))}

        {thinking && (
          <motion.div className="eng-chat-msg eng-chat-msg--assistant"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="eng-chat-msg-icon" style={{ background: `${primary}18` }}>
              <Sparkles size={10} style={{ color: primary }} />
            </div>
            <div className="eng-chat-bubble eng-chat-bubble--thinking">
              <span className="eng-thinking-dot" />
              <span className="eng-thinking-dot" />
              <span className="eng-thinking-dot" />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggested prompts ───────────────────────────────────── */}
      {messages.length === 0 && (
        <div className="eng-chat-suggestions">
          {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
            <button
              key={p}
              className="eng-chat-suggestion"
              onClick={() => onSend(p)}
              style={{ borderColor: `${primary}25`, color: theme?.textMuted }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="eng-chat-input-area">
        <div className="eng-chat-input-row">
          <input
            ref={inputRef}
            className="eng-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask me to modify the dashboard…"
            disabled={thinking}
          />
          <motion.button
            className="eng-chat-send"
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            style={{ background: primary }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {thinking ? <Loader2 size={15} className="mi-spin" /> : <Send size={15} />}
          </motion.button>
        </div>
        <p className="eng-chat-hint">Press Enter to send · Every change creates a new version</p>
      </div>
    </motion.div>
  );
}
