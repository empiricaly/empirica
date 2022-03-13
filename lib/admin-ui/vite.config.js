import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import builtins from "rollup-plugin-node-builtins";
import { defineConfig } from "vite";
import restart from "vite-plugin-restart";
import windi from "vite-plugin-windicss";

const builtinsPlugin = { ...builtins(), name: "rollup-plugin-node-builtins" };

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
      restart({
        restart: ["./windi.config.cjs"],
      }),
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
    rollupInputOptions: {
      preserveEntrySignatures: "strict",
      plugins: [builtinsPlugin],
    },
  };
});
