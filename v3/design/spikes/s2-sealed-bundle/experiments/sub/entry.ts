import a from "../dist/index.html" with { type: "file" };
import b from "../dist/assets/index-D8fXk2Qz.css" with { type: "file" };
console.log(JSON.stringify({ a, b, embedded: ((Bun as any).embeddedFiles??[]).map((f:File)=>f.name) }, null, 1));
