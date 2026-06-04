import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Renderer } from '@openuidev/react-lang';
import { openuiChatLibrary, openuiChatPromptOptions } from '@openuidev/react-ui/genui-lib';
import { useChat } from '../hooks/useChat.js';
import './ChatPanel.css';

const BASE_SYSTEM_PROMPT = openuiChatLibrary.prompt(openuiChatPromptOptions);

const DEFAULT_STARTERS = [
  { icon: '💰', text: "I'm paying $250/mo for HubSpot CRM. What are my options?" },
  { icon: '📊', text: 'Compare project management tools — Asana vs Monday vs ClickUp vs Jira' },
  { icon: '🏢', text: "We're a 15-person startup using Figma, Slack, and AWS. Find us cheaper alternatives" },
  { icon: '🔍', text: "Analyze Notion's pricing and find me cheaper alternatives" },
];

const ICONS = ['💡', '📊', '🔍', '📡', '🎯', '⚡'];

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

export default function ChatPanel({ instructions, fileContext, agentName, starters }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const getSystemPrompt = useCallback(() => {
    let prompt = BASE_SYSTEM_PROMPT;
    if (instructions) prompt += `\n\n## Agent Instructions\n${instructions}`;
    if (fileContext) prompt += `\n\n## Uploaded Data\n${fileContext.slice(0, 80_000)}`;
    return prompt;
  }, [instructions, fileContext]);

  const { messages, streaming, sendMessage, stop, clearMessages } = useChat({ getSystemPrompt });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {isEmpty ? (
          <WelcomeView agentName={agentName} starters={starters} onStarter={(t) => { setInput(t); sendMessage(t); }} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            <AnimatePresence>
              {streaming && (
                <motion.div
                  className="streaming-indicator"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="streaming-avatar">
                    <BotIcon size={14} />
                  </div>
                  <div className="streaming-wave">
                    <span /><span /><span /><span /><span />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask anything… (${isMac ? '⌘' : 'Ctrl'}↵ to send)`}
            rows={1}
          />
          <div className="chat-input-actions">
            <button className="btn-attach" title="Attach file">
              <AttachIcon />
            </button>
            {streaming ? (
              <button className="btn-stop" onClick={stop} title="Stop generation">
                <StopIcon />
              </button>
            ) : (
              <button
                className="btn-send"
                onClick={submit}
                disabled={!input.trim()}
                title={`Send (${isMac ? '⌘' : 'Ctrl'}↵)`}
              >
                <SendIcon />
              </button>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn-clear" onClick={clearMessages}>Clear conversation</button>
        )}
      </div>
    </div>
  );
}

function WelcomeView({ agentName, starters, onStarter }) {
  const activeStarters = starters && starters.length > 0
    ? starters.map((text, i) => ({ icon: ICONS[i % ICONS.length], text }))
    : DEFAULT_STARTERS;

  return (
    <motion.div
      className="welcome-view"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Icon with glow rings */}
      <div className="welcome-icon-wrap">
        <div className="welcome-ring welcome-ring-3" />
        <div className="welcome-ring welcome-ring-2" />
        <div className="welcome-ring welcome-ring-1" />
        <div className="welcome-icon">
          <BotIcon size={32} />
        </div>
      </div>

      <h1 className="welcome-title">{agentName || 'Agent Builder'}</h1>
      <p className="welcome-sub">
        {agentName
          ? `Your ${agentName} is configured and ready. Ask a question to get started.`
          : 'Build, configure, and test your AI agent.'}
      </p>

      {!agentName && (
        <div className="welcome-steps">
          <div className="welcome-step">
            <div className="welcome-step-icon"><UploadIcon /></div>
            <div>
              <div className="welcome-step-title">Upload data</div>
              <div className="welcome-step-desc">Connect files and data sources in the left panel</div>
            </div>
          </div>
          <div className="welcome-step-divider" />
          <div className="welcome-step">
            <div className="welcome-step-icon"><InstructionsIcon /></div>
            <div>
              <div className="welcome-step-title">Add instructions</div>
              <div className="welcome-step-desc">Define how the agent thinks and responds</div>
            </div>
          </div>
          <div className="welcome-step-divider" />
          <div className="welcome-step">
            <div className="welcome-step-icon"><RocketSmIcon /></div>
            <div>
              <div className="welcome-step-title">Deploy & share</div>
              <div className="welcome-step-desc">Get a shareable link for your agent</div>
            </div>
          </div>
        </div>
      )}

      <div className="starter-grid">
        {activeStarters.slice(0, 4).map((s, i) => (
          <motion.button
            key={s.text}
            className="starter-card"
            onClick={() => onStarter(s.text)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.35 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="starter-icon">{s.icon}</span>
            <span className="starter-text">{s.text}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function MessageItem({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        className="message message-user"
        initial={{ opacity: 0, y: 8, x: 12 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="message-bubble">{message.content}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="message message-assistant"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="message-avatar">
        <BotIcon size={16} />
      </div>
      <div className="message-content">
        {message.isError ? (
          <div className="message-error">{message.content}</div>
        ) : (
          <Renderer
            response={message.content}
            library={openuiChatLibrary}
            isStreaming={message.isStreaming}
          />
        )}
      </div>
    </motion.div>
  );
}

// ── Icons ─────────────────────────────────────────────────────
function BotIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="13" rx="2"/>
      <path d="M8 8V6a4 4 0 018 0v2"/>
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/>
      <path d="M9 18h6" strokeLinecap="round"/>
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8L2 2l3 6-3 6 11.5-6z" fill="currentColor"/>
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="2" y="2" width="10" height="10" rx="1.5"/>
    </svg>
  );
}
function AttachIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M13.5 7.5l-6 6a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.535 3.535L5.5 11.5a1 1 0 01-1.414-1.414L10 4" strokeLinecap="round"/>
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 10V3M5 6l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" strokeLinecap="round"/>
    </svg>
  );
}
function InstructionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 3h12M2 7h8M2 11h10" strokeLinecap="round"/>
    </svg>
  );
}
function RocketSmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M9.5 2.5C11 1 14.5 1.5 14.5 1.5S15 5 13.5 6.5L8 12l-4-4 5.5-5.5z" strokeLinejoin="round"/>
      <path d="M5 11L2 14M6.5 9.5l-2 2" strokeLinecap="round"/>
    </svg>
  );
}
