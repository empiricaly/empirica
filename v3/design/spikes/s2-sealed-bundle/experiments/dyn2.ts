import "./manifest.generated.ts";
const name = process.argv[2]; // truly runtime value
try {
  const m = await import("./dist/assets/" + name);
  console.log("dynamic import(argv):", JSON.stringify(m));
} catch (e: any) { console.log("dynamic import(argv) FAIL:", String(e?.message).split("\n")[0]); }
try {
  const m = await import("/$bunfs/root/dist/assets/" + name);
  console.log("dynamic import($bunfs+argv):", JSON.stringify(m));
} catch (e: any) { console.log("dynamic import($bunfs+argv) FAIL:", String(e?.message).split("\n")[0]); }
