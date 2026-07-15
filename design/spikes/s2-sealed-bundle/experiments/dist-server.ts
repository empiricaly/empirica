// Serves an entire embedded Vite-style dist/ from the manifest, with SPA fallback.
import { manifest } from "./manifest.generated.ts";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 4271),
  fetch(req) {
    const { pathname } = new URL(req.url);
    const key = pathname === "/" ? "/index.html" : pathname;
    const embedded = manifest[key] ?? manifest["/index.html"]; // SPA fallback
    const file = Bun.file(embedded);
    return new Response(file, { headers: { "content-type": file.type } });
  },
});
console.log(`dist-server on :${server.port}, ${Object.keys(manifest).length} embedded assets`);
console.log("embeddedFiles:", ((Bun as any).embeddedFiles ?? []).map((f: File) => f.name));
console.log("manifest:", manifest);
