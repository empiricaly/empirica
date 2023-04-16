import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    user: "src/admin/user.ts",
    admin: "src/admin/index.ts",
    "admin-classic": "src/admin/classic/index.ts",
    player: "src/player/index.ts",
    "player-react": "src/player/react/index.ts",
    "player-classic": "src/player/classic/index.ts",
    "player-classic-react": "src/player/classic/react/index.ts",
    console: "src/utils/console.ts",
  },
  format: ["esm", "cjs"],
  // splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
});
