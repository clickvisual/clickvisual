import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __CLICKVISUAL_PUBLIC_PATH__: JSON.stringify(process.env.PUBLIC_PATH || process.env.VITE_PUBLIC_PATH || "")
  },
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
