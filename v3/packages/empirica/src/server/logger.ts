import pino, { type Logger as PinoLogger, type LoggerOptions } from "pino";

// Logger wrapper.
//
// Why a wrapper rather than re-exporting pino? Two reasons:
//   1. The runtime injects context (request ID, game ID) on child loggers; we
//      want a stable shape regardless of pino internals.
//   2. We want `createLogger` callable from tests with a sink array so we can
//      assert log output without grepping stdout.

export interface Logger {
  trace(msg: string, fields?: Record<string, unknown>): void;
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerConfig {
  level?: "trace" | "debug" | "info" | "warn" | "error" | "silent";
  /**
   * If true, write human-friendly output to stderr (dev). If false, write
   * JSON to stdout (prod).
   */
  pretty?: boolean;
  /**
   * Optional sink for tests. Receives every log entry as a structured object;
   * when set, no output is written elsewhere.
   */
  sink?: (entry: LogEntry) => void;
}

export interface LogEntry {
  level: "trace" | "debug" | "info" | "warn" | "error";
  msg: string;
  time: number;
  bindings: Record<string, unknown>;
  fields: Record<string, unknown>;
}

export function createLogger(config: LoggerConfig = {}): Logger {
  if (config.sink) return new SinkLogger(config.sink, {});
  return new PinoLoggerImpl(buildPino(config), {});
}

function buildPino(config: LoggerConfig): PinoLogger {
  const opts: LoggerOptions = {
    level: config.level ?? "info",
  };
  if (config.pretty) {
    return pino({
      ...opts,
      transport: {
        target: "pino/file",
        options: { destination: 2 },
      },
    });
  }
  return pino(opts);
}

class PinoLoggerImpl implements Logger {
  constructor(
    private readonly p: PinoLogger,
    private readonly bindings: Record<string, unknown>,
  ) {}

  trace(msg: string, fields?: Record<string, unknown>): void {
    this.p.trace(fields ?? {}, msg);
  }
  debug(msg: string, fields?: Record<string, unknown>): void {
    this.p.debug(fields ?? {}, msg);
  }
  info(msg: string, fields?: Record<string, unknown>): void {
    this.p.info(fields ?? {}, msg);
  }
  warn(msg: string, fields?: Record<string, unknown>): void {
    this.p.warn(fields ?? {}, msg);
  }
  error(msg: string, fields?: Record<string, unknown>): void {
    this.p.error(fields ?? {}, msg);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new PinoLoggerImpl(this.p.child(bindings), { ...this.bindings, ...bindings });
  }
}

class SinkLogger implements Logger {
  constructor(
    private readonly sink: (entry: LogEntry) => void,
    private readonly bindings: Record<string, unknown>,
  ) {}

  private emit(level: LogEntry["level"], msg: string, fields?: Record<string, unknown>): void {
    this.sink({
      level,
      msg,
      time: Date.now(),
      bindings: this.bindings,
      fields: fields ?? {},
    });
  }

  trace(msg: string, fields?: Record<string, unknown>): void {
    this.emit("trace", msg, fields);
  }
  debug(msg: string, fields?: Record<string, unknown>): void {
    this.emit("debug", msg, fields);
  }
  info(msg: string, fields?: Record<string, unknown>): void {
    this.emit("info", msg, fields);
  }
  warn(msg: string, fields?: Record<string, unknown>): void {
    this.emit("warn", msg, fields);
  }
  error(msg: string, fields?: Record<string, unknown>): void {
    this.emit("error", msg, fields);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new SinkLogger(this.sink, { ...this.bindings, ...bindings });
  }
}
