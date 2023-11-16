import { svelte } from "@sveltejs/vite-plugin-svelte";
import builtins from "rollup-plugin-polyfill-node";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

const builtinsPlugin = {
  ...builtins({ include: ["fs/promises"] }),
  name: "rollup-plugin-polyfill-node",
};

export default defineConfig({
  server: {
    port: 3001,
    open: false,
    host: "0.0.0.0",
  },
  clearScreen: false,
  // resolve: {
  //   alias: {
  //     $components: resolve("src/components"),
  //     $assets: resolve("src/assets"),
  //   },
  // },
  plugins: [svelte(), UnoCSS()],
  define: {
    "process.env": {
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  },
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      plugins: [builtinsPlugin],
      output: {
        sourcemap: true,
      },
    },
  },
});
