import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each package owns its own vitest config; this root config is just for
    // running everything at once and for shared CI defaults.
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/e2e/**",
    ],
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: process.env.CI ? "test-results/junit.xml" : undefined,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/test/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.ts",
        "**/*.d.ts",
      ],
    },
    // Tight per-test deadline keeps async tests honest.
    testTimeout: 5_000,
    hookTimeout: 5_000,
  },
});
