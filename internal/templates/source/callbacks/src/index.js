import {
  AdminContext,
  Classic,
  classicKinds,
  ClassicLoader,
  info,
  setLogLevel,
} from "@empirica/core";
import minimist from "minimist";
import process from "process";
import callbacks from "./callbacks";

setLogLevel("trace");

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
  ctx.register(function (_) {
    _.on("ready", function () {
      info("callbacks: started");
    });
  });
})();
