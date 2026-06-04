import { useState, useCallback, useRef } from 'react';

export function useChat({ getSystemPrompt }) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);

  const sendMessage = useCallback(
    async (userText) => {
      if (!userText.trim() || streaming) return;

      const userMsg = { role: 'user', content: userText.trim(), id: Date.now() };
      const assistantId = Date.now() + 1;
      const assistantMsg = { role: 'assistant', content: '', id: assistantId, isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history,
            systemPrompt: getSystemPrompt(),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;
            try {
              const { text, error } = JSON.parse(payload);
              if (error) throw new Error(error);
              if (text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + text }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, isError: true }
              : m
          )
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        );
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, getSystemPrompt]
  );

  function stop() {
    abortRef.current?.abort();
  }

  function clearMessages() {
    setMessages([]);
  }

  return { messages, streaming, sendMessage, stop, clearMessages };
}
