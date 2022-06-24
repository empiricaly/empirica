import {
  AdminContext,
  Classic,
  classicKinds,
  ClassicLoader,
} from "@empirica/core";
import minimist from "minimist";
import process from "process";
import callbacks from "./callbacks";

let argv = process && minimist(process.argv.slice(2), { string: ["token"] });

(async () => {
  const ctx = await AdminContext.init(
    "http://localhost:3000/query",
    argv["sessionTokenPath"],
    "callbacks",
    argv["token"],
    {},
    classicKinds
  );
  ctx.register(ClassicLoader);
  ctx.register(Classic);
  ctx.register(callbacks);
})();
