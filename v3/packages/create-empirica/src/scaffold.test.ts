import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scaffoldTemplate, TEMPLATES } from "./scaffold.js";

describe("scaffoldTemplate", () => {
  for (const tpl of TEMPLATES) {
    it(`scaffolds the ${tpl.name} template into a fresh dir`, async () => {
      const dir = await mkdtemp(join(tmpdir(), "empirica-scaffold-"));
      const target = join(dir, "out");
      await scaffoldTemplate({
        template: tpl.name,
        target,
        tailwind: false,
        projectName: "my-app",
      });
      const entries = await readdir(target);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries).toContain("package.json");

      const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8")) as {
        name: string;
      };
      expect(pkg.name).toBe("my-app");
    });
  }
});
