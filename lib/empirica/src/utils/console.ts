import chalk from "chalk";

var log = console.log;

function logger(level: string) {
  return function () {
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
      [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters)
    );
  };
}

console.trace = logger(chalk.cyanBright("TRC"));
console.log = logger(chalk.magentaBright("DBG"));
console.debug = logger(chalk.magentaBright("DBG"));
console.info = logger(chalk.greenBright("INF"));
console.warn = logger(chalk.yellowBright("WRN"));
console.error = logger(chalk.redBright("ERR"));
