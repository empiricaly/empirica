import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "shared/index": "src/shared/index.ts",
    "server/index": "src/server/index.ts",
    "client/index": "src/client/index.ts",
    "react/index": "src/react/index.tsx",
    "testing/index": "src/testing/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "node20",
  external: ["react", "react-dom", "better-sqlite3"],
});
