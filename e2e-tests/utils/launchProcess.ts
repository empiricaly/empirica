import * as childProcess from "node:child_process";

export default function executeCommand({
  command,
  params,
  env = {},
  hideOutput = false,
  cwd,
}: {
  command: string;
  params: string[];
  hideOutput?: boolean;
  env?: Record<string, string>;
  cwd?: string;
}): Promise<string | number> {
  return new Promise((resolve, reject) => {
    console.log(`Executing "${command}" with params "${params}"`);

    const spawnedProcess = childProcess.spawn(command, params, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
    });

    let cmdOutput = "";

    spawnedProcess.stdout.on("data", (data) => {
      if (hideOutput) {
        console.log(`${data}`);
      }

      cmdOutput += data;
    });

    spawnedProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    spawnedProcess.on("close", (code) => {
      console.log(`"${command}" process exited with code ${code}`);

      if (code === 0) {
        resolve(cmdOutput);
      } else {
        console.log(cmdOutput);

        reject(code);
      }
    });
  });
}
