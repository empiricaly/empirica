import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: true,
});
