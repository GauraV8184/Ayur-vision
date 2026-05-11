import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration for AyurVision AI frontend
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev: browser calls same-origin /api → forwards to Express (JWT + AI proxy).
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

