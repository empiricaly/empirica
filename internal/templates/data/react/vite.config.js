import reactRefresh from "@vitejs/plugin-react-refresh";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8884,
  },
  plugins: [reactRefresh()],
});
