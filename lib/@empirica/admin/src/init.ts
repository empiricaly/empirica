import fs from "fs";
import minimist from "minimist";
import { Callbacks } from "./callbacks";
import { Empirica } from "./empirica";
import { levels, setLogLevel } from "./utils/console";

// Increase stack trace size
Error.stackTraceLimit = Infinity;

let defaultURL = "http://localhost:3000/query";

if (typeof window !== "undefined" && window.location) {
  const host = window.location.hostname;
  if (host !== "localhost") {
    defaultURL = "https://" + host + "/query";
  }
}

export async function connect({
  url = defaultURL,
  name = "callbacks",
  token,
  sessionTokenPath,
  logLevel,
  cbs,
}: {
  url?: string;
  name?: string;
  token?: string;
  sessionTokenPath?: string;
  logLevel?: keyof typeof levels;
  cbs: Callbacks;
}) {
  let argv = process && minimist(process.argv.slice(2), { string: ["token"] });

  if (!token) {
    token = argv["token"];
  }

  if (!sessionTokenPath) {
    sessionTokenPath = argv["sessionTokenPath"];
  }

  if (!logLevel) {
    logLevel = argv["loglevel"];
  }

  if (!token) {
    console.error(
      "callbacks: service token to connect to Tajriba is required (--token)"
    );

    process.exit(1);
  }

  const sighup = () => {
    process.exit(0);
  };
  process.on("SIGHUP", sighup);

  let quitResolve: (value: unknown) => void;
  const quit = new Promise((resolve) => {
    quitResolve = resolve;
  });

  const sigint = () => {
    quitResolve(1);
  };
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
    if (!token) {
      console.error("callbacks: token missing");
      process.exit(1);
    }
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
