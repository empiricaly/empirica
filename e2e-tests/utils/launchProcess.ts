import * as childProcess from "node:child_process";

export default function executeCommand({
  command,
  params,
  cwd,
}: {
  command: string;
  params: string[];
  cwd?: string;
}) {
  return new Promise((resolve, reject) => {
    const process = childProcess.spawn(command, params, {
      cwd,
    });

    process.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    process.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    process.on("close", (code) => {
      console.log(`"${command}" process exited with code ${code}`);

      if (code === 0) {
        resolve(true);
      } else {
        reject(code);
      }
    });
  });
}
