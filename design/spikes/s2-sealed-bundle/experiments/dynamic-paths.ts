// What works with DYNAMIC (runtime-computed) paths inside a compiled binary?
import "./manifest.generated.ts"; // force embedding (compiled with [dir]/[name].[ext])

const results: Record<string, string> = {};

async function probe(label: string, fn: () => Promise<string>) {
  try {
    results[label] = "OK: " + (await fn());
  } catch (e: any) {
    results[label] = "FAIL: " + (e?.message ?? String(e)).split("\n")[0];
  }
}

// 1. Original source-relative path (what naive code would try)
await probe("Bun.file('./dist/index.html')", async () => {
  const t = await Bun.file("./dist/index.html").text();
  return `${t.length} bytes`;
});

// 2. Runtime-computed /$bunfs path (virtual FS root, name known at runtime)
await probe("Bun.file('/$bunfs/root/' + dynamicName)", async () => {
  const name = ["dist", "index.html"].join("/"); // computed, not a literal
  const t = await Bun.file("/$bunfs/root/" + name).text();
  return `${t.length} bytes`;
});

// 3. node:fs readdir on the virtual FS — can we enumerate it like a directory?
await probe("fs.readdirSync('/$bunfs/root')", async () => {
  const { readdirSync } = await import("node:fs");
  return JSON.stringify(readdirSync("/$bunfs/root"));
});

// 4. node:fs readFileSync on an embedded path
await probe("fs.readFileSync(embedded path)", async () => {
  const { readFileSync } = await import("node:fs");
  return `${readFileSync("/$bunfs/root/dist/index.html").length} bytes`;
});

// 5. dynamic import() of a runtime-computed module path
await probe("await import(computedPath)", async () => {
  const p = "./dist/assets/vendor-" + "Ch4NkH4sh.js";
  const m = await import(p);
  return JSON.stringify(m);
});

// 6. Bun.embeddedFiles is always enumerable
await probe("Bun.embeddedFiles", async () => {
  const files = ((Bun as any).embeddedFiles ?? []) as File[];
  return files.map((f) => `${f.name}(${f.size})`).join(", ");
});

console.log(JSON.stringify(results, null, 2));
