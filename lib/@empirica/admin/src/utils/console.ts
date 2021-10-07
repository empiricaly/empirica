import chalk from "chalk";

var log = console.log;

const levels = {
  trace: 0,
  log: 1,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

let currentLevel = 2;

export function setLogLevel(level: keyof typeof levels) {
  const lvl = levels[level];
  if (lvl === undefined) {
    return;
  }

  currentLevel = lvl;
}

function logger(lvl: number, level: string) {
  return function () {
    if (lvl < currentLevel) {
      return;
    }

    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate(date: Date) {
      var hour = date.getHours();
      var minutes = date.getMinutes();
      var seconds = date.getSeconds();
      var milliseconds = date.getMilliseconds();

      return (
        level +
        " [" +
        (hour < 10 ? "0" + hour : hour) +
        ":" +
        (minutes < 10 ? "0" + minutes : minutes) +
        ":" +
        (seconds < 10 ? "0" + seconds : seconds) +
        "." +
        ("00" + milliseconds).slice(-3) +
        "] "
      );
    }

    log.apply(
      console,
      [formatConsoleDate(new Date()), first_parameter].concat(other_parameters)
    );
  };
}

console.trace = logger(0, chalk.cyanBright("TRC"));
console.log = logger(1, chalk.magentaBright("DBG"));
console.debug = logger(1, chalk.magentaBright("DBG"));
console.info = logger(2, chalk.greenBright("INF"));
console.warn = logger(3, chalk.yellowBright("WRN"));
console.error = logger(4, chalk.redBright("ERR"));
