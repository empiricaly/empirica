import reactRefresh from "@vitejs/plugin-react-refresh";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8844,
    strictPort: true,
    host: "0.0.0.0",
    clearScreen: false,
  },
  logLevel: "warn",
  plugins: [reactRefresh()],
});
