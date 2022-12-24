import * as childProcess from "node:child_process";

export default function executeCommand({
  command,
  params,
  env = {},
  cwd,
}: {
  command: string;
  params: string[];
  env?: Record<string, string>;
  cwd?: string;
}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing "${command}" with params "${params}"`);

    const spawnedProcess = childProcess.spawn(command, params, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
    });

    spawnedProcess.stdout.on("data", (data) => {
      console.log(`${data}`);
    });

    spawnedProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    spawnedProcess.on("close", (code) => {
      console.log(`"${command}" process exited with code ${code}`);

      if (code === 0) {
        resolve(true);
      } else {
        reject(code);
      }
    });
  });
}
