/**
 * Media Intelligence API client.
 *
 * - projectsApi, uploadsApi, taggedArticlesApi, chartsApi
 *     → remote backend via VITE_API_BASE_URL (.env)
 * - aiApi
 *     → local Express server (server.js) at localhost:3001 via Vite proxy
 */

import axios from 'axios';

const errorInterceptor = (err) => {
  const message =
    err.response?.data?.detail ??
    err.response?.data?.error ??
    err.response?.data?.message ??
    err.message ??
    'Unknown error';
  return Promise.reject(new Error(message));
};

// ── Remote client (VITE_API_BASE_URL) ────────────────────────────────────────

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});
http.interceptors.response.use((r) => r, errorInterceptor);

async function req(path, init = {}) {
  const res = await http.request({ url: path, ...init });
  return res.data;
}

// ── Local client (localhost:3001 via Vite proxy) ──────────────────────────────

const localHttp = axios.create({
  baseURL: '',   // same-origin → Vite proxy forwards /api/* to localhost:3001
  headers: { 'Content-Type': 'application/json' },
});
localHttp.interceptors.response.use((r) => r, errorInterceptor);

async function localReq(path, init = {}) {
  const res = await localHttp.request({ url: path, ...init });
  return res.data;
}

// ── Projects / Workflows ──────────────────────────────────────────────────────

export const projectsApi = {
  list:           ()            => req('/workflow'),
  get:            (id)          => req(`/workflow/${id}`),
  submitWorkflow: (payload)     => req('/workflow',       { method: 'POST', data: payload }),
  update:         (id, payload) => req(`/workflow/${id}`, { method: 'PUT',  data: payload }),
  remove:         (id)          => req(`/workflow/${id}`, { method: 'DELETE' }),
};

// ── File uploads ──────────────────────────────────────────────────────────────

export const uploadsApi = {
  withWorkflow: async (workflowId, file) => {
    const fd = new FormData();
    fd.append('workflow_id', workflowId);
    fd.append('file', file);
    const res = await http.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

// ── Tagged article review ─────────────────────────────────────────────────────

export const taggedArticlesApi = {
  get: (projectId, lensId) => {
    const params = new URLSearchParams();
    if (projectId) params.append('workflow_id', projectId);
    if (lensId)    params.append('lens_id', lensId);
    return req(`/review/tagged?${params.toString()}`);
  },
  update: (projectId, selectedLensId, payload) =>
    req(`/review/tagged?workflow_id=${projectId}&lens_id=${selectedLensId}`, {
      method: 'PUT',
      data: payload,
    }),
};

// ── Charts ────────────────────────────────────────────────────────────────────

export const chartsApi = {
  get: (workflowId, lensId) =>
    req(`/charts?workflow_id=${workflowId}&lens_id=${lensId}`),
};

// ── Dropdowns — lens & LLM reference data ─────────────────────────────────────
// GET /dropdowns → { lens: [{id, label, description}], llm: [{id, label}] }

export const dropdownsApi = {
  get: () => req('/dropdowns'),
};

// ── AI (local Express server.js) ─────────────────────────────────────────────

export const aiApi = {
  interpretCharts: (payload) =>
    localReq('/api/media/interpret-charts', { method: 'POST', data: payload }),

  narrate: (payload) =>
    localReq('/api/media/narrate', { method: 'POST', data: payload }),
};
