// vite.config.js
import { defineConfig } from "file:///sessions/vibrant-eloquent-ride/mnt/Agent-with-OpenUI/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/vibrant-eloquent-ride/mnt/Agent-with-OpenUI/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Our Express backend (AI routes, Agent Builder)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      // Real Media Intelligence backend — proxied in dev so VITE_API_BASE_URL can be omitted
      // In production, set VITE_API_BASE_URL to your real backend URL
      "/workflow": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3001",
        changeOrigin: true
      },
      "/upload": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3001",
        changeOrigin: true
      },
      "/review": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3001",
        changeOrigin: true
      },
      "/charts": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3001",
        changeOrigin: true
      },
      "/ws": {
        target: process.env.VITE_WS_PROXY_TARGET || "ws://localhost:3001",
        changeOrigin: true,
        ws: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvdmlicmFudC1lbG9xdWVudC1yaWRlL21udC9BZ2VudC13aXRoLU9wZW5VSS9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL3ZpYnJhbnQtZWxvcXVlbnQtcmlkZS9tbnQvQWdlbnQtd2l0aC1PcGVuVUkvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL3ZpYnJhbnQtZWxvcXVlbnQtcmlkZS9tbnQvQWdlbnQtd2l0aC1PcGVuVUkvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3NCxcbiAgICBwcm94eToge1xuICAgICAgLy8gT3VyIEV4cHJlc3MgYmFja2VuZCAoQUkgcm91dGVzLCBBZ2VudCBCdWlsZGVyKVxuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAvLyBSZWFsIE1lZGlhIEludGVsbGlnZW5jZSBiYWNrZW5kIFx1MjAxNCBwcm94aWVkIGluIGRldiBzbyBWSVRFX0FQSV9CQVNFX1VSTCBjYW4gYmUgb21pdHRlZFxuICAgICAgLy8gSW4gcHJvZHVjdGlvbiwgc2V0IFZJVEVfQVBJX0JBU0VfVVJMIHRvIHlvdXIgcmVhbCBiYWNrZW5kIFVSTFxuICAgICAgJy93b3JrZmxvdyc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX0FQSV9QUk9YWV9UQVJHRVQgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAnL3VwbG9hZCc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX0FQSV9QUk9YWV9UQVJHRVQgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAnL3Jldmlldyc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX0FQSV9QUk9YWV9UQVJHRVQgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAnL2NoYXJ0cyc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX0FQSV9QUk9YWV9UQVJHRVQgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAnL3dzJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfV1NfUFJPWFlfVEFSR0VUIHx8ICd3czovL2xvY2FsaG9zdDozMDAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VyxTQUFTLG9CQUFvQjtBQUN6WSxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQTtBQUFBLE1BRUwsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUE7QUFBQTtBQUFBLE1BR0EsYUFBYTtBQUFBLFFBQ1gsUUFBUSxRQUFRLElBQUkseUJBQXlCO0FBQUEsUUFDN0MsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxRQUFRLFFBQVEsSUFBSSx5QkFBeUI7QUFBQSxRQUM3QyxjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFdBQVc7QUFBQSxRQUNULFFBQVEsUUFBUSxJQUFJLHlCQUF5QjtBQUFBLFFBQzdDLGNBQWM7QUFBQSxNQUNoQjtBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsUUFBUSxRQUFRLElBQUkseUJBQXlCO0FBQUEsUUFDN0MsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxPQUFPO0FBQUEsUUFDTCxRQUFRLFFBQVEsSUFBSSx3QkFBd0I7QUFBQSxRQUM1QyxjQUFjO0FBQUEsUUFDZCxJQUFJO0FBQUEsTUFDTjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
