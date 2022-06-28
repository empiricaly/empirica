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
import { Empirica } from "./callbacks";

const argv = minimist(process.argv.slice(2), { string: ["token"] });

setLogLevel(argv["logLevel"] || "info");

(async () => {
  const ctx = await AdminContext.init(
    argv["url"] || "http://localhost:3000/query",
    argv["sessionTokenPath"],
    "callbacks",
    argv["token"],
    {},
    classicKinds
  );

  ctx.register(ClassicLoader);
  ctx.register(Classic);
  ctx.register(Empirica);
  ctx.register(function (_) {
    _.on("ready", function () {
      info("callbacks: started");
    });
  });
})();
