import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Renderer } from '@openuidev/react-lang';
import { openuiChatLibrary, openuiChatPromptOptions } from '@openuidev/react-ui/genui-lib';
import { useChat } from '../hooks/useChat.js';
import './ShareView.css';

const BASE_SYSTEM_PROMPT = openuiChatLibrary.prompt(openuiChatPromptOptions);

export default function ShareView({ shareId, onBack }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`/api/share/${shareId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setAgent)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [shareId]);

  const getSystemPrompt = useCallback(() => {
    if (!agent) return BASE_SYSTEM_PROMPT;
    let prompt = BASE_SYSTEM_PROMPT;
    if (agent.instructions) prompt += `\n\n## Agent Instructions\n${agent.instructions}`;
    if (agent.fileContext) prompt += `\n\n## Uploaded Data\n${agent.fileContext.slice(0, 80_000)}`;
    return prompt;
  }, [agent]);

  const { messages, streaming, sendMessage, stop } = useChat({ getSystemPrompt });

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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  if (loading) {
    return (
      <div className="share-loading">
        <div className="spinner" />
        <p>Loading agent…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-error">
        <h2>Agent not found</h2>
        <p>This agent link may have expired or the server was restarted.</p>
        <button className="btn-primary" onClick={onBack}>← Back to Builder</button>
      </div>
    );
  }

  const starters = agent.conversationStarters || [];

  return (
    <div className="share-view">
      <header className="share-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeftIcon /> Back to Builder
        </button>
        <div className="share-header-center">
          <span className="share-agent-name">{agent.name}</span>
          <span className="share-badge">Live</span>
        </div>
        <div style={{ width: 120 }} />
      </header>

      <div className="share-body">
        <div className="share-messages">
          {messages.length === 0 ? (
            <div className="share-welcome">
              <div className="share-welcome-icon">🤖</div>
              <h2>{agent.name}</h2>
              <p>Ask me anything — I'm ready to help.</p>
              {starters.length > 0 && (
                <div className="share-starters">
                  {starters.map((s) => (
                    <button key={s} className="starter-card" onClick={() => { setInput(s); sendMessage(s); }}>
                      <span className="starter-text">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`share-msg share-msg-${msg.role}`}>
                  {msg.role === 'user' ? (
                    <div className="share-msg-bubble">{msg.content}</div>
                  ) : (
                    <div className="share-msg-content">
                      <Renderer
                        response={msg.content}
                        library={openuiChatLibrary}
                        isStreaming={msg.isStreaming}
                      />
                    </div>
                  )}
                </div>
              ))}
              {streaming && (
                <div className="streaming-indicator">
                  <span /><span /><span />
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="share-input-area">
          <div className="chat-input-box">
            <textarea
              className="chat-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything…"
              rows={1}
            />
            <div className="chat-input-actions">
              {streaming ? (
                <button className="btn-stop" onClick={stop}>
                  <StopIcon />
                </button>
              ) : (
                <button className="btn-send" onClick={submit} disabled={!input.trim()}>
                  <SendIcon />
                </button>
              )}
            </div>
          </div>
          <p className="share-footer">Powered by AlphaMetricx Agent Builder</p>
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SendIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 8L2 2l3 6-3 6 11.5-6z" fill="currentColor"/></svg>;
}
function StopIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="10" height="10" rx="1.5"/></svg>;
}
