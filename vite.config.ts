import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
  server: {
    fs: {
      allow: [".", "node_modules"],
    },
    proxy: {
      "/api": {
        target: "http://***REMOVED***:8081",
        changeOrigin: true,
      },
    },
  },
})
