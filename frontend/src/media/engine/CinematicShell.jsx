/**
 * CinematicShell — Full-screen cinematic dashboard frame.
 *
 * Provides:
 *  - Video/image background with subtle overlay
 *  - Preview Mode / Chat Mode toggle (top-center)
 *  - Left icon rail (navigation)
 *  - Right icon rail (actions)
 *  - Bottom AI chat bar with rotating contextual prompts
 *  - Slide-in Project Settings panel
 *
 * Usage:
 *  <CinematicShell
 *    mode="preview"                  // "preview" | "chat"
 *    onModeChange={(m) => ...}
 *    brandName="Delta"
 *    leftNavItems={[...]}            // [{id, icon, label, active, onClick}]
 *    chatMessages={[...]}
 *    chatThinking={false}
 *    onChatSend={(msg) => ...}
 *    onExport={() => ...}
 *    onShare={() => ...}
 *    settings={<SettingsPanel />}    // optional
 *    backgroundVideoUrl="..."
 *    backgroundImageUrl="..."
 *    suggestedPrompts={[...]}        // [{tag, text}]
 *  >
 *    {children}  ← dashboard content
 *  </CinematicShell>
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Monitor, Star, Layers, Settings, Target,
  Calendar, Download, Share2, ArrowRight, Plus,
  Send, Sparkles, X, ChevronRight,
} from 'lucide-react';

// ── Default video (aerial forest) ─────────────────────────────────────────────
const DEFAULT_VIDEO =
  'https://www.pexels.com/download/video/13095214/';
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=2400&q=80';

// ── Rotating prompt interval ───────────────────────────────────────────────────
const PROMPT_INTERVAL = 5000;

export default function CinematicShell({
  mode = 'preview',
  onModeChange,
  brandName = 'Brand',
  leftNavItems = [],
  chatMessages = [],
  chatThinking = false,
  onChatSend,
  onExport,
  onShare,
  backgroundVideoUrl,
  backgroundImageUrl,
  suggestedPrompts = [],
  settingsContent,
  children,
  periodLabel = 'Weekly',
  onPeriodClick,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatInput, setChatInput]       = useState('');
  const [promptIdx, setPromptIdx]       = useState(0);
  const videoRef = useRef(null);

  // Rotate bottom prompts
  useEffect(() => {
    if (!suggestedPrompts.length) return;
    const id = setInterval(() => setPromptIdx((i) => (i + 1) % suggestedPrompts.length), PROMPT_INTERVAL);
    return () => clearInterval(id);
  }, [suggestedPrompts.length]);

  const videoSrc  = backgroundVideoUrl ?? DEFAULT_VIDEO;
  const imageSrc  = backgroundImageUrl ?? DEFAULT_IMAGE;
  const useVideo  = !!backgroundVideoUrl;

  const currentPrompt = suggestedPrompts[promptIdx] ?? null;

  function submitChat(text) {
    const msg = (text ?? chatInput).trim();
    if (!msg) return;
    onChatSend?.(msg);
    setChatInput('');
  }

  return (
    <div className="cine-shell">

      {/* ── Background ──────────────────────────────────────────── */}
      {useVideo ? (
        <video
          ref={videoRef}
          className="cine-bg-video"
          src={videoSrc}
          autoPlay loop muted playsInline
        />
      ) : (
        <div className="cine-bg-img" style={{ backgroundImage: `url(${imageSrc})` }} />
      )}
      <div className="cine-bg-overlay" />

      {/* ── Mode Toggle ─────────────────────────────────────────── */}
      <div className="cine-mode-toggle">
        <button
          className={`cine-mode-btn ${mode === 'preview' ? 'cine-mode-btn--active' : ''}`}
          onClick={() => onModeChange?.('preview')}
        >
          Preview Mode
        </button>
        <button
          className={`cine-mode-btn ${mode === 'chat' ? 'cine-mode-btn--active' : ''}`}
          onClick={() => onModeChange?.('chat')}
        >
          Chat Mode
        </button>
      </div>

      {/* ── Left Rail ───────────────────────────────────────────── */}
      <nav className="cine-left-rail">
        <div className="cine-rail-group">
          {leftNavItems.map((item) => (
            <button
              key={item.id}
              className={`cine-rail-btn ${item.active ? 'cine-rail-btn--active' : ''}`}
              onClick={item.onClick}
              title={item.label}
            >
              {item.active && (
                <span className="cine-rail-btn-label">{item.label}</span>
              )}
              <item.Icon size={16} strokeWidth={1.6} />
            </button>
          ))}
        </div>
        <div className="cine-rail-group cine-rail-group--bottom">
          <button className="cine-rail-btn cine-rail-btn--add" title="Add dashboard">
            <Plus size={16} strokeWidth={1.6} />
          </button>
          <button
            className={`cine-rail-btn ${settingsOpen ? 'cine-rail-btn--active' : ''}`}
            onClick={() => setSettingsOpen((o) => !o)}
            title="Settings"
          >
            <Settings size={16} strokeWidth={1.6} />
          </button>
        </div>
      </nav>

      {/* ── Right Rail ──────────────────────────────────────────── */}
      <nav className="cine-right-rail">
        <button className="cine-rail-btn" onClick={onPeriodClick} title="Calendar / Period">
          <Calendar size={15} strokeWidth={1.6} />
        </button>
        <button className="cine-rail-btn" onClick={onExport} title="Export">
          <Download size={15} strokeWidth={1.6} />
        </button>
        <button className="cine-rail-btn" onClick={onShare} title="Share">
          <Share2 size={15} strokeWidth={1.6} />
        </button>
      </nav>

      {/* ── Content area ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          className="cine-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* ── Project Settings Panel ───────────────────────────────── */}
      <AnimatePresence>
        {settingsOpen && settingsContent && (
          <motion.div
            className="cine-settings-panel"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="cine-settings-header">
              <div className="cine-settings-title-row">
                <Settings size={14} />
                <span>Project Settings</span>
              </div>
              <button className="cine-settings-close" onClick={() => setSettingsOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="cine-settings-body">
              {settingsContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Chat Bar ──────────────────────────────────────── */}
      <div className="cine-chat-bar">
        {mode === 'preview' && currentPrompt && (
          <AnimatePresence mode="wait">
            <motion.div
              key={promptIdx}
              className="cine-chat-bar-prompt"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <span className="cine-prompt-tag">{currentPrompt.tag}</span>
              <span className="cine-prompt-text">{currentPrompt.text}</span>
              <div className="cine-prompt-dots">
                {suggestedPrompts.map((_, i) => (
                  <span
                    key={i}
                    className={`cine-prompt-dot ${i === promptIdx ? 'cine-prompt-dot--active' : ''}`}
                  />
                ))}
              </div>
              <button
                className="cine-chat-send-btn"
                onClick={() => submitChat(currentPrompt.text)}
              >
                <ArrowRight size={14} />
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {mode === 'chat' && (
          <div className="cine-chat-input-row">
            <input
              className="cine-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitChat()}
              placeholder="Ask anything about your media data…"
            />
            <button
              className="cine-chat-send-btn cine-chat-send-btn--filled"
              onClick={() => submitChat()}
              disabled={!chatInput.trim()}
            >
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
