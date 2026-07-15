import index from "./htmlapp/index.html";
const server = Bun.serve({
  port: Number(process.env.PORT ?? 4274),
  routes: { "/*": index },
});
console.log("html-bundle server on :" + server.port);
console.log("embedded:", ((Bun as any).embeddedFiles ?? []).map((f: File) => f.name));
