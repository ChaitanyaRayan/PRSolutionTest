// vite.config.js
import { defineConfig } from "file:///sessions/vigilant-charming-rubin/mnt/Agent-with-OpenUI/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/vigilant-charming-rubin/mnt/Agent-with-OpenUI/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 3e3,
    proxy: {
      // Our Express backend (AI routes, Agent Builder)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      // Real Media Intelligence backend — proxied in dev so VITE_API_BASE_URL can be omitted
      // In production, set VITE_API_BASE_URL to your real backend URL
      // Match /workflow and /workflow/... but NOT /workflows (frontend route)
      "^/workflow(/.*)?$": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:3001",
        changeOrigin: true
      },
      "/upload": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:3001",
        changeOrigin: true
      },
      "/review": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:3001",
        changeOrigin: true
      },
      "/charts": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:3001",
        changeOrigin: true
      },
      "/ws": {
        target: "wss://pr-solutions-be.devamx.com",
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvdmlnaWxhbnQtY2hhcm1pbmctcnViaW4vbW50L0FnZW50LXdpdGgtT3BlblVJL2Zyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvdmlnaWxhbnQtY2hhcm1pbmctcnViaW4vbW50L0FnZW50LXdpdGgtT3BlblVJL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy92aWdpbGFudC1jaGFybWluZy1ydWJpbi9tbnQvQWdlbnQtd2l0aC1PcGVuVUkvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBwcm94eToge1xuICAgICAgLy8gT3VyIEV4cHJlc3MgYmFja2VuZCAoQUkgcm91dGVzLCBBZ2VudCBCdWlsZGVyKVxuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAvLyBSZWFsIE1lZGlhIEludGVsbGlnZW5jZSBiYWNrZW5kIFx1MjAxNCBwcm94aWVkIGluIGRldiBzbyBWSVRFX0FQSV9CQVNFX1VSTCBjYW4gYmUgb21pdHRlZFxuICAgICAgLy8gSW4gcHJvZHVjdGlvbiwgc2V0IFZJVEVfQVBJX0JBU0VfVVJMIHRvIHlvdXIgcmVhbCBiYWNrZW5kIFVSTFxuICAgICAgLy8gTWF0Y2ggL3dvcmtmbG93IGFuZCAvd29ya2Zsb3cvLi4uIGJ1dCBOT1QgL3dvcmtmbG93cyAoZnJvbnRlbmQgcm91dGUpXG4gICAgICAnXi93b3JrZmxvdygvLiopPyQnOiB7XG4gICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9BUElfQkFTRV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAnL3VwbG9hZCc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX0FQSV9CQVNFX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfSxcbiAgICAgICcvcmV2aWV3Jzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfQVBJX0JBU0VfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgICAgJy9jaGFydHMnOiB7XG4gICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9BUElfQkFTRV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBcIi93c1wiOiB7XG4gICAgICAgIHRhcmdldDogXCJ3c3M6Ly9wci1zb2x1dGlvbnMtYmUuZGV2YW14LmNvbVwiLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWtYLFNBQVMsb0JBQW9CO0FBQy9ZLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBO0FBQUEsTUFFTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUlBLHFCQUFxQjtBQUFBLFFBQ25CLFFBQVEsUUFBUSxJQUFJLHFCQUFxQjtBQUFBLFFBQ3pDLGNBQWM7QUFBQSxNQUNoQjtBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsUUFBUSxRQUFRLElBQUkscUJBQXFCO0FBQUEsUUFDekMsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxRQUFRLFFBQVEsSUFBSSxxQkFBcUI7QUFBQSxRQUN6QyxjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFdBQVc7QUFBQSxRQUNULFFBQVEsUUFBUSxJQUFJLHFCQUFxQjtBQUFBLFFBQ3pDLGNBQWM7QUFBQSxNQUNoQjtBQUFBLE1BQ0EsT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLFFBQ0osY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
