import { Empirica, setLogLevel } from "@empirica/admin";
import minimist from "minimist";
import advancedHooks from "./hooks.mjs";
import hooks from "../hooks.mjs";

var argv = minimist(process.argv.slice(2));

if (argv["loglevel"]) {
  setLogLevel(argv["loglevel"]);
}

const url = "http://localhost:8882/query";

process.on("SIGHUP", () => {
  process.exit(0);
});

let quitResolve;
const quit = new Promise((resolve) => {
  quitResolve = resolve;
});

process.on("SIGINT", function () {
  quitResolve();
});

(async () => {
  try {
    const [admin, _] = await Empirica.registerService(
      url,
      "callbacks",
      "0123456789123456",
      hooks.merge(advancedHooks)
    );
  } catch (e) {
    console.error(e);
  }

  await quit;

  process.exit(0);
})();
