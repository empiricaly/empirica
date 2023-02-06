import * as childProcess from "node:child_process";

export default function killProcess({
  port,
}: {
  port: number;
}){
    childProcess.exec(`kill -9 $(lsof -t -i:${port})`);
}
