import { useState, useEffect, useCallback, useRef } from 'react';
import { aiApi } from '../api/client';

/**
 * useDashboardConfig — fetches and manages the full 5-layer dashboard config.
 * The entire dashboard is driven by this config; the frontend renders it blindly.
 */
export function useDashboardConfig(workflowId, lensId) {
  const [config,       setConfig]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [activeTabId,  setActiveTabId]  = useState(null);
  const configRef = useRef(null);

  const load = useCallback(async (regenerate = false) => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      // Pass both workflowId AND lensId per the new API spec
      const lensParam = lensId ? `&lens_id=${lensId}` : '';
      const url = regenerate
        ? `/api/dashboard/${workflowId}?regenerate=1${lensParam}`
        : `/api/dashboard/${workflowId}?${lensParam.slice(1)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig(data);
      configRef.current = data;
      if (!activeTabId && data.storyboard?.[0]) {
        setActiveTabId(data.storyboard[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workflowId, lensId]);

  useEffect(() => {
    if (workflowId) load();
  }, [workflowId, lensId]);

  const applyConfigUpdate = useCallback((newConfig) => {
    setConfig(newConfig);
    configRef.current = newConfig;
  }, []);

  return { config, loading, error, activeTabId, setActiveTabId, reload: load, applyConfigUpdate };
}

/**
 * useDashboardChat — manages conversational chat state + API calls.
 */
export function useDashboardChat(workflowId, onConfigUpdate) {
  const [messages,  setMessages]  = useState([]);
  const [thinking,  setThinking]  = useState(false);
  const [chatError, setChatError] = useState(null);

  const sendMessage = useCallback(async (text) => {
    if (!workflowId || !text.trim()) return;

    const userMsg = { role: 'user', content: text, id: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setThinking(true);
    setChatError(null);

    try {
      const res = await fetch(`/api/dashboard/${workflowId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-6).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg = { role: 'assistant', content: data.message, id: Date.now() + 1, changesApplied: data.changesApplied };
      setMessages((m) => [...m, assistantMsg]);

      if (data.config && data.changesApplied > 0) {
        onConfigUpdate?.(data.config);
      }
    } catch (err) {
      setChatError(err.message);
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry, I couldn't process that. ${err.message}`, id: Date.now() + 1, error: true }]);
    } finally {
      setThinking(false);
    }
  }, [workflowId, messages, onConfigUpdate]);

  return { messages, thinking, chatError, sendMessage };
}
