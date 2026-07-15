// Lint walls (design/04-engine.md, design/15-development-plan.md):
// determinism is enforced mechanically, not by review.
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Use ctx.now — engine code must be deterministic (D10)." },
        { object: "Math", property: "random", message: "Use ctx.rng — engine code must be deterministic (D10)." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "Use ctx.now — argless new Date() breaks replay (D10)." },
      ],
    },
  },
);
