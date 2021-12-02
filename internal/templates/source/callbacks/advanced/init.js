import { Empirica, setLogLevel } from "@empirica/admin";
import fs from "fs";
import minimist from "minimist";
import callbacks from "../callbacks.js";
import advancedCallbacks from "./callbacks.js";

Error.stackTraceLimit = Infinity;

var argv = minimist(process.argv.slice(2), { string: ["token"] });

if (argv["loglevel"]) {
  setLogLevel(argv["loglevel"]);
}

if (!argv["token"]) {
  console.error(
    "callbacks: service token to connect to Tajriba is required (--token)"
  );

  process.exit(1);
}

const sessionTokenPath = argv["sessionTokenPath"];
const token = argv["token"];
const name = "callbacks";
const url = "http://localhost:3000/query";

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

const h = callbacks.merge(advancedCallbacks);

export async function connect() {
  let connected = false;

  if (sessionTokenPath) {
    let sessionToken;
    try {
      sessionToken = fs.readFileSync(sessionTokenPath, "utf8");
    } catch (err) {
      console.debug("callbacks: sessionToken read failed");
      console.trace(err);
    }

    if (sessionToken) {
      console.debug("callbacks: found sessionToken, logging in with session");
      try {
        await Empirica.sessionLogin(url, sessionToken, h);
        connected = true;
        console.info("callbacks: started");
      } catch (err) {
        console.debug("callbacks: failed logging in with session");
        console.trace(err);
      }
    }
  }

  if (!connected) {
    try {
      const [_, st] = await Empirica.registerService(url, name, token, h);

      console.info("callbacks: started");

      if (sessionTokenPath) {
        try {
          fs.writeFileSync(sessionTokenPath, st, { flag: "w+" });
          console.debug("callbacks: session token saved");
        } catch (err) {
          console.error("callbacks: failed to save sessionToken");
          console.trace(err);
        }
      }
    } catch (err) {
      console.error("callbacks: failed to start");
      console.error(err);
      process.exit(1);
    }
  }

  await quit;

  process.exit(0);
}
