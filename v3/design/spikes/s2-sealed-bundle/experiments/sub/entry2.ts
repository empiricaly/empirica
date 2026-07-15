import a from "../dist/index.html" with { type: "file" };
const t = await Bun.file(a).text().catch((e) => "READ FAIL: " + e.message);
console.log("path:", a, "| read:", typeof t === "string" && t.startsWith("<!doctype") ? `OK ${t.length}B` : t);
// serve one request to prove Response(Bun.file(weirdPath)) works too
const s = Bun.serve({ port: 4276, fetch: () => new Response(Bun.file(a)) });
const r = await fetch("http://localhost:4276/").then((r) => r.text());
console.log("served:", r.startsWith("<!doctype") ? `OK ${r.length}B` : "FAIL");
s.stop();
