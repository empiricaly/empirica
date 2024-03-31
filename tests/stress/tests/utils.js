import { exec as cpexec } from "child_process";

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function randomString(length) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function exec(cmd, wd) {
  return new Promise((resolve, reject) => {
    cpexec(
      cmd,
      {
        cwd: wd,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        resolve({ stdout, stderr });
      }
    );
  });
}
