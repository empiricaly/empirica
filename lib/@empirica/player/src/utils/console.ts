var log = console.log;

const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";

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

const colorHex = {
  [Color.Bold]: "font-weight: bold",
  [Color.Black]: "color: #000000",
  [Color.Red]: "color: #cc0000",
  [Color.Green]: "color: #4e9a06",
  [Color.Yellow]: "color: #c4a000",
  [Color.Blue]: "color: #729fcf",
  [Color.Magenta]: "color: #75507b",
  [Color.Cyan]: "color: #06989a",
  [Color.White]: "color: #d3d7cf",
  [Color.DarkGray]: "color: #555753",
};

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

function logger(lvl: number, level: string[]) {
  return function () {
    if (lvl < currentLevel) {
      return;
    }

    // var first_parameter = arguments[0];
    // var other_parameters = Array.prototype.slice.call(arguments, 1);

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
        ("00" + milliseconds).slice(-3);

      if (isBrowser) {
        const ts = colorize(str, Color.DarkGray).concat(level);
        return [ts[0] + " " + level[0], ts[1], level[1]];
      }

      return colorize(str, Color.DarkGray).concat(level);
    }

    log.apply(
      console,
      formatConsoleDate(new Date()).concat(
        Array.prototype.slice.call(arguments)
      )
    );
  };
}

function colorize(s: string, ...cc: Color[]): string[] {
  if (isBrowser) {
    const attr = [];
    for (const c of cc) {
      attr.push(colorHex[c]);
    }

    return [`%c${s}`, attr.join("; ")];
  }

  let out = "";
  for (const c of cc) {
    out += `\x1b[${c}m${s}\x1b[0m`;
  }

  return [out];
}

console.trace = logger(0, colorize("TRC", Color.Magenta));
console.debug = logger(1, colorize("DBG", Color.Yellow));
console.log = logger(2, colorize("LOG", Color.Yellow));
console.info = logger(2, colorize("INF", Color.Green));
console.warn = logger(3, colorize("WRN", Color.Red));
console.error = logger(4, colorize("ERR", Color.Red, Color.Bold));
