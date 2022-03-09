import fs from "fs";
import minimist from "minimist";
import process from "process";
import { Callbacks } from "./callbacks";
import { Empirica } from "./empirica";
import { levels, setLogLevel } from "./utils/console";

Error.stackTraceLimit = Infinity;

var argv = minimist(process.argv.slice(2), { string: ["token"] });

export async function connect({
  url = "http://localhost:3000/query",
  name = "callbacks",
  token = argv["token"],
  sessionTokenPath = argv["sessionTokenPath"],
  logLevel = argv["loglevel"],
  cbs,
}: {
  url?: string;
  name?: string;
  token?: string;
  sessionTokenPath?: string;
  logLevel?: keyof typeof levels;
  cbs: Callbacks;
}) {
  if (!token) {
    console.error(
      "callbacks: service token to connect to Tajriba is required (--token)"
    );

    process.exit(1);
  }

  const sighup = () => process.exit(0);
  process.on("SIGHUP", sighup);

  let quitResolve: (value: unknown) => void;
  const quit = new Promise((resolve) => {
    quitResolve = resolve;
  });

  const sigint = () => quitResolve;
  process.on("SIGINT", sigint);

  if (logLevel) {
    setLogLevel(logLevel);
  }

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
        await Empirica.sessionLogin(url, sessionToken, cbs);
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
      const [_, st] = await Empirica.registerService(url, name, token, cbs);

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

  process.off("SIGHUP", sighup);
  process.off("SIGINT", sigint);
}
