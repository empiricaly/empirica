import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { defineConfig } from "vite";
import restart from "vite-plugin-restart";
import windi from "vite-plugin-windicss";

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
    define: {
      "process.env": process.env,
    },
  };
});
