import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:19001",
        changeOrigin: true,
        headers: {
          "X-CLICKVISUAL-USER": "clickvisual",
          "X-CLICKVISUAL-NICKNAME": "clickvisual"
        }
      }
    }
  },
  build: {
    emptyOutDir: true,
    outDir: "../api/internal/ui/v2dist/dist"
  }
});
