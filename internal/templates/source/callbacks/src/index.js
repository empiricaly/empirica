import { AdminContext } from "@empirica/core/admin";
import { info, setLogLevel } from "@empirica/core/console";
import {
  Classic,
  classicKinds,
  ClassicLoader,
} from "@empirica/core/admin/classic";
import minimist from "minimist";
import process from "process";
import { Empirica } from "./callbacks";

const argv = minimist(process.argv.slice(2), { string: ["token"] });

setLogLevel(argv["loglevel"] || "info");

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
  ctx.register(Classic());
  ctx.register(Empirica);
  ctx.register(function (_) {
    _.on("ready", function () {
      info("callbacks: started");
    });
  });
})();
