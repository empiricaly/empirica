import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/player" },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:4321",
      "/ws": { target: "ws://localhost:4321", ws: true },
    },
  },
});
