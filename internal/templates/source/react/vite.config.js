import react from "@vitejs/plugin-react";
import builtins from "rollup-plugin-polyfill-node";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import restart from "vite-plugin-restart";
import UnoCSS from "unocss/vite";
import dns from "dns";

dns.setDefaultResultOrder("verbatim");

const builtinsPlugin = {
  ...builtins({ include: ["fs/promises"] }),
  name: "rollup-plugin-polyfill-node",
};

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["@empirica/tajriba", "@empirica/core"],
  },
  server: {
    port: 8844,
    open: false,
    strictPort: true,
    host: "0.0.0.0",
    hmr: {
      host: "localhost",
      protocol: "ws",
      port: 8844,
    },
    fs: {
      allow: [
        // search up for workspace root
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    minify: false,
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      plugins: [builtinsPlugin],
      output: {
        sourcemap: true,
      },
    },
  },
  clearScreen: false,
  plugins: [
    restart({
      restart: [
        "./uno.config.cjs",
        "./node_modules/@empirica/core/dist/**/*.{js,ts,jsx,tsx,css}",
        "./node_modules/@empirica/core/assets/**/*.css",
      ],
    }),
    UnoCSS(),
    react(),
  ],
  define: {
    "process.env": {
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  },
});
