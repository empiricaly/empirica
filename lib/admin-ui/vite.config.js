import { resolve } from "path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import windi from "vite-plugin-windicss";
import restart from "vite-plugin-restart";

export default defineConfig(({ command, mode }) => {
  const production = mode === "production";
  return {
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
    define: {
      "process.env": process.env,
    },
  };
});
