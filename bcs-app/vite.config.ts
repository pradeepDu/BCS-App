import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", // Backend URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""), // Remove "/api" prefix
      },
    },
  },
});