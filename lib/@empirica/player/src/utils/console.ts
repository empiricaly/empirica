var log = console.log;

enum Color {
  Bold = 1,

  Black = 30,
  Red,
  Green,
  Yellow,
  Blue,
  Magenta,
  Cyan,
  White,

  DarkGray = 90,
}

const levels = {
  trace: 0,
  debug: 1,
  log: 2,
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

      const str =
        (hour < 10 ? "0" + hour : hour) +
        ":" +
        (minutes < 10 ? "0" + minutes : minutes) +
        ":" +
        (seconds < 10 ? "0" + seconds : seconds) +
        "." +
        ("00" + milliseconds).slice(-3) +
        " " +
        level;

      return colorize(str, Color.DarkGray);
    }

    log.apply(
      console,
      [formatConsoleDate(new Date()), first_parameter].concat(other_parameters)
    );
  };
}

function colorize(s: string, c: Color): string {
  return `\x1b[${c}m${s}\x1b[0m`;
}

console.trace = logger(0, colorize("TRC", Color.Magenta));
console.debug = logger(1, colorize("DBG", Color.Yellow));
console.log = logger(2, colorize("DBG", Color.Yellow));
console.info = logger(2, colorize("INF", Color.Green));
console.warn = logger(3, colorize("WRN", Color.Red));
console.error = logger(4, colorize(colorize("ERR", Color.Red), Color.Bold));
