import { useEffect } from 'react';
import { useMediaStore } from '../store/mediaStore';
import toast from 'react-hot-toast';

export function useWorkflowWS(projectId) {
  const { setPipelineComplete } = useMediaStore();
console.log({projectId});

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    // In production VITE_WSS_KEY points directly to the WS server.
    // In dev it is unset so we fall through to the Vite proxy path.
    const wsUrl =
      // import.meta.env.VITE_WSS_KEY ||
      (() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/process`;
      })();

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (cancelled) {
        ws.close();
        return;
      }
      ws.send(JSON.stringify({ workflow_id: parseInt(projectId, 10) }));
    };

    ws.onmessage = (evt) => {
      if (cancelled) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'complete') {
          ws.close();
          setPipelineComplete(true);
        } else if (msg.type === 'error') {
          ws.close();
          const detail = typeof msg.detail === 'string' ? msg.detail : 'Processing failed';
          toast.error(detail);
        }
      } catch {
        // malformed message — ignore
      }
    };

    ws.onerror = () => {
      if (cancelled) return;
      toast.error('WebSocket connection error');
    };

    return () => {
      cancelled = true;
      // only close if the handshake is already complete — avoids the
      // "closed before connection established" error when React StrictMode
      // tears down and re-runs effects in dev
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [projectId]);
}
