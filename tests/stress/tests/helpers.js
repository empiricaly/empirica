import chalk from "chalk";

export function error(message) {
  console.info(chalk.redBright(message));
}
