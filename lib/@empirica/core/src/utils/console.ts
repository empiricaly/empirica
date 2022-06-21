/* c8 ignore start */

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

export type LogLine = { level: string; args: any[] };
class LogsMock {
  public logs: LogLine[] = [];

  log(line: LogLine) {
    this.logs.push(line);
  }

  clear() {
    this.logs = [];
  }
}

let logsMock: LogsMock | undefined;
export function captureLogs(cb: () => void): LogLine[] {
  const lm = mockLogging();
  cb();
  const ret = lm.logs;
  stopMockLogging();

  return ret;
}

export async function captureLogsAsync(
  cb: () => Promise<void>
): Promise<LogLine[]> {
  const lm = mockLogging();
  await cb();
  const ret = lm.logs;
  stopMockLogging();

  return ret;
}

export function mockLogging() {
  if (!logsMock) {
    logsMock = new LogsMock();
  }

  return logsMock;
}

export function stopMockLogging() {
  logsMock = undefined;
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

export const levels: { [key: string]: number } = {
  trace: 0,
  debug: 1,
  log: 2,
  info: 2,
  warn: 3,
  error: 4,
};

const reversLevels: { [key: number]: string } = {};
for (const key in levels) {
  reversLevels[levels[key]!] = key;
}

let currentLevel = 2;

export function setLogLevel(level: keyof typeof levels) {
  const lvl = levels[level];
  if (lvl === undefined) {
    return;
  }

  currentLevel = lvl;
}

function formatConsoleDate(date: Date, level: string[]) {
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

const createLogger = (lvl: number, level: string[]) => {
  return (...args: any[]) => {
    if (lvl < currentLevel) {
      return;
    }

    if (logsMock) {
      logsMock.log({ level: reversLevels[lvl]!, args: args });
      return;
    }

    console.log(...formatConsoleDate(new Date(), level).concat(args));
  };
};

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
    out += `\x1b[${c}m`;
  }
  out += `${s}\x1b[0m`;

  return [out];
}

export const trace = createLogger(0, colorize("TRC", Color.Magenta));
export const debug = createLogger(1, colorize("DBG", Color.Yellow));
export const log = createLogger(2, colorize("LOG", Color.Yellow));
export const info = createLogger(2, colorize("INF", Color.Green));
export const warn = createLogger(3, colorize("WRN", Color.Cyan));
export const error = createLogger(4, colorize("ERR", Color.Red, Color.Bold));

// export {
//   trace,
//   debug,
//   log,
//   info,
//   warn,
//   error,
// };

// export function warn(...args: string[]) {}
