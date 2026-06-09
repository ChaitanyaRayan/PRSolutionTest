import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Our Express backend (AI routes, Agent Builder)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Real Media Intelligence backend — proxied in dev so VITE_API_BASE_URL can be omitted
      // In production, set VITE_API_BASE_URL to your real backend URL
      // Match /workflow and /workflow/... but NOT /workflows (frontend route)
      '^/workflow(/.*)?$': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/upload': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/review': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/charts': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      "/ws": {
        target: "wss://pr-solutions-be.devamx.com",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
