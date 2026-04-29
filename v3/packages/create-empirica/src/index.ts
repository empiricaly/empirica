import { existsSync } from "node:fs";
import { resolve } from "node:path";
import kleur from "kleur";
import prompts from "prompts";
import { TEMPLATES, type TemplateName, scaffoldTemplate } from "./scaffold.js";

// Entrypoint for `npx create-empirica`. Lightly interactive; supports flags
// for headless / CI use.

interface ParsedArgs {
  name?: string;
  template?: TemplateName;
  tailwind?: boolean;
  yes?: boolean;
  help?: boolean;
}

export async function main(argv: ReadonlyArray<string>): Promise<number> {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  const name =
    args.name ??
    (
      await prompts(
        {
          type: "text",
          name: "name",
          message: "Project name",
          initial: "my-empirica-app",
          validate: (s: string) => (s.trim().length > 0 ? true : "required"),
        },
        { onCancel: () => process.exit(1) },
      )
    ).name;

  const template: TemplateName =
    args.template ??
    (
      await prompts(
        {
          type: "select",
          name: "template",
          message: "Template",
          choices: TEMPLATES.map((t) => ({ title: t.title, description: t.description, value: t.name })),
        },
        { onCancel: () => process.exit(1) },
      )
    ).template;

  const tailwind =
    args.tailwind ??
    (
      await prompts(
        { type: "toggle", name: "v", message: "Use Tailwind CSS?", initial: true, active: "yes", inactive: "no" },
        { onCancel: () => process.exit(1) },
      )
    ).v;

  const target = resolve(process.cwd(), name);
  if (existsSync(target)) {
    console.error(kleur.red(`Refusing to overwrite ${target}`));
    return 1;
  }

  await scaffoldTemplate({ template, target, tailwind, projectName: name });

  // Final guidance.
  console.log("");
  console.log(kleur.green("✔ Created"), kleur.bold(name));
  console.log("");
  console.log("Next steps:");
  console.log(`  ${kleur.cyan(`cd ${name}`)}`);
  console.log(`  ${kleur.cyan("pnpm install")}`);
  console.log(`  ${kleur.cyan("pnpm dev")}`);
  return 0;
}

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const args: ParsedArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-y":
      case "--yes":
        args.yes = true;
        break;
      case "-t":
      case "--template": {
        const v = argv[++i];
        if (!v) throw new Error("--template requires a value");
        args.template = v as TemplateName;
        break;
      }
      case "--tailwind":
        args.tailwind = true;
        break;
      case "--no-tailwind":
        args.tailwind = false;
        break;
      default:
        if (!a) break;
        if (a.startsWith("-")) throw new Error(`unknown flag: ${a}`);
        if (!args.name) args.name = a;
        break;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: create-empirica [name] [--template <name>] [--tailwind|--no-tailwind] [-y]

Templates:
${TEMPLATES.map((t) => `  ${t.name.padEnd(14)}${t.description}`).join("\n")}
`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.env.CREATE_EMPIRICA_RUN === "1") {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
