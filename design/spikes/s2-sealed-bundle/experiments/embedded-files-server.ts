// Approach B: enumerate Bun.embeddedFiles at runtime instead of a manifest map.
// Requires --asset-naming="[name].[ext]" so embedded names match the URL basenames.
// GOTCHA under test: names are FLAT — directory structure ("assets/") is lost.
import "./manifest.generated.ts"; // imports force embedding; we ignore the map here

const byName = new Map<string, File>();
for (const f of ((Bun as any).embeddedFiles ?? []) as File[]) byName.set(f.name!, f);

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4272),
  fetch(req) {
    const { pathname } = new URL(req.url);
    // Flat lookup: strip all directories from the URL and match by basename.
    const base = pathname === "/" ? "index.html" : pathname.split("/").pop()!;
    const f = byName.get(base) ?? byName.get("index.html")!;
    return new Response(f, { headers: { "content-type": f.type } });
  },
});
console.log(`embedded-files-server on :${server.port}`);
console.log("embeddedFiles names:", [...byName.keys()]);
