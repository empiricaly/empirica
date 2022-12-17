import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import builtins from "rollup-plugin-polyfill-node";
import { defineConfig } from "vite";
import windi from "vite-plugin-windicss";

const builtinsPlugin = {
  ...builtins({ include: ["fs/promises"] }),
  name: "rollup-plugin-polyfill-node",
};

export default defineConfig(({ command, mode }) => {
  const production = mode === "production";
  return {
    server: {
      port: 3001,
      open: false,
    },
    clearScreen: false,
    resolve: {
      alias: {
        $components: resolve("src/components"),
        $assets: resolve("src/assets"),
      },
    },
    plugins: [
      windi(),
      svelte({
        hot: !production,
      }),
    ],
    define: production
      ? {}
      : {
          "process.env": process.env,
        },
    build: {
      minify: false,
      sourcemap: true,
    },
    rollupInputOptions: {
      preserveEntrySignatures: "strict",
      plugins: [builtinsPlugin],
      sourcemap: true,
    },
  };
});
