import reactRefresh from "@vitejs/plugin-react-refresh";
import { resolve } from "path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import restart from "vite-plugin-restart";
import windi from "vite-plugin-windicss";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8844,
    open: false,
    strictPort: true,
    host: "0.0.0.0",
    fs: {
      allow: [
        // search up for workspace root
        searchForWorkspaceRoot(process.cwd()),
        // @empirica/player lookup for windi
        "./node_modules/@empirica/player/dist-src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@empirica/player/assets/**/*.css",
      ],
    },
  },
  build: {
    minify: false,
  },
  clearScreen: false,
  resolve: {
    alias: {
      $components: resolve("src/components"),
      $assets: resolve("src/assets"),
    },
  },
  // logLevel: "warn",
  plugins: [
    restart({
      restart: [
        "./windi.config.cjs",
        "./node_modules/@empirica/player/dist-src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@empirica/player/assets/**/*.css",
      ],
    }),
    windi(),
    reactRefresh(),
  ],
  define: {
    "process.env": {
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  },
});
