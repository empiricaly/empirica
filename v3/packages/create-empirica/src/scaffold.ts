import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Scaffold templates by copying a directory tree from `templates/` into the
// target. Tokens like `{{name}}` are replaced in package.json files.

export interface Template {
  name: TemplateName;
  title: string;
  description: string;
}

export type TemplateName = "minimal" | "solo" | "default" | "lobby-game";

export const TEMPLATES: ReadonlyArray<Template> = [
  { name: "minimal", title: "Minimal", description: "Empty starter, no examples." },
  { name: "solo", title: "Solo", description: "Single-player; no assignment or lobby." },
  { name: "default", title: "Default", description: "Multi-player canonical project." },
  {
    name: "lobby-game",
    title: "Lobby Game",
    description: "Multi-player with explicit lobby + matchmaking.",
  },
];

export async function scaffoldTemplate(input: {
  template: TemplateName;
  target: string;
  tailwind: boolean;
  projectName: string;
}): Promise<void> {
  const root = resolveTemplatesRoot();
  const src = join(root, input.template);
  await mkdir(input.target, { recursive: true });
  await cp(src, input.target, { recursive: true });

  // Token-replace in select files.
  const pkgPath = join(input.target, "package.json");
  await replaceInFile(pkgPath, (s) => s.replaceAll("{{name}}", input.projectName));
}

async function replaceInFile(path: string, fn: (s: string) => string): Promise<void> {
  try {
    const original = await readFile(path, "utf8");
    const next = fn(original);
    if (next !== original) await writeFile(path, next, "utf8");
  } catch {
    // missing file: not all templates have every file
  }
}

function resolveTemplatesRoot(): string {
  // Templates ship inside the package. We resolve relative to the compiled
  // dist/ directory: the layout is `dist/index.js` + `templates/<name>/...`.
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "templates");
}
