import { spawn } from "child_process";
import fs from "fs";
import readline from "readline";
import tmp from "tmp";
import { promiseHandle } from "../../promises";

const VERBOSE = false;

// This cleans up the temporary files, beware.
tmp.setGracefulCleanup();

export interface TajServer {
  stop: () => void;
  port: number;
  url: string;
  username: string;
  password: string;
  srtoken: string;
}

const config = (
  username = "username",
  password = "password",
  srtoken = "0123456789123456"
) =>
  `[tajriba.auth]
srtoken = "` +
  srtoken +
  `"

[[tajriba.auth.users]]
name = "Nicolas"
username = "` +
  username +
  `"
password = "` +
  password +
  `"
`;

function createTajribaConfigFile(config: string): string {
  const { name } = tmp.fileSync({ discardDescriptor: true, postfix: ".toml" });
  fs.writeFileSync(name, config);
  return name;
}

export interface StartTajribaOptions {
  configFile?: string;
  tajFile?: string;
  logLevel?: string;
  printLogs?: boolean;
  srtoken?: string;
  username?: string;
  password?: string;
}

export async function startTajriba(
  options: StartTajribaOptions = {}
): Promise<TajServer> {
  let port: number;
  const logLevel = options.logLevel ?? "trace";

  let configFile =
    options.configFile ??
    createTajribaConfigFile(
      config(options.username, options.password, options.srtoken)
    );

  const args = [
    "tajriba",
    "--config",
    configFile,
    "--log.level",
    logLevel,
    "--log.json",
    "--tajriba.log.level",
    logLevel,
    "--tajriba.log.json",
    "--tajriba.server.addr",
    ":0",
  ];

  if (options.tajFile) {
    args.push("--tajriba.store.file", options.tajFile);
  } else {
    args.push("--tajriba.store.mem");
  }

  // console.log(args);

  let empiricaCmd = "empirica";

  if (process.env.EMPIRICA_DEV !== "") {
    empiricaCmd = "emp";
  }

  console.info(
    `Starting Tajriba server with: ${empiricaCmd} ${args.join(" ")}`
  );

  const taj = spawn(empiricaCmd, args);

  readline.createInterface({ input: taj.stdout! }).on("line", (data) => {
    console.log(`stdout: ${data}`);
  });

  const portProm = promiseHandle<number>();

  readline.createInterface({ input: taj.stderr! }).on("line", (data) => {
    try {
      const dat = JSON.parse(data);
      if (dat["message"] && dat["message"] === "Started Tajriba server") {
        portProm.result(dat["port"] as number);
      }

      if (
        VERBOSE ||
        options.printLogs ||
        (dat["level"] && dat["level"] === "error")
      ) {
        console.log(`stderr: ${data}`);
      }
    } catch (e) {
      console.error(data.toString());
    }
  });

  taj.on("error", (error) => {
    console.error(`error: ${error.message}`);
  });

  taj.on("close", (code) => {
    if (code) {
      console.log(`child process exited with code ${code}`);
    }
  });

  port = await portProm.promise;

  // Wait to make sure HTTP server is ready with all endpoints.
  await sleep(200);

  let stopped = false;
  return {
    port,
    get url() {
      return `http://localhost:${port}/query`;
    },
    get username() {
      return options.username || "username";
    },
    get password() {
      return options.password || "password";
    },
    get srtoken() {
      return options.srtoken || "0123456789123456";
    },
    stop: function stopTajriba() {
      if (!stopped) {
        // console.log("kill", port);
        taj.kill("SIGKILL");
        stopped = true;
      }
    },
  };
}

export async function withTajriba(
  fn: (tajServer: TajServer) => void,
  options: StartTajribaOptions = {}
) {
  const srv = await startTajriba(options);
  try {
    await fn(srv);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    srv.stop();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
