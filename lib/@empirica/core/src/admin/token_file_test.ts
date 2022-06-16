import test from "ava";
import fs from "fs/promises";
import { Subject } from "rxjs";
import { fake, replace, restore } from "sinon";
import {
  nextTick,
  setupTokenProvider,
  textHasLog,
} from "../shared/test_helpers";
import { captureLogsAsync } from "../utils/console";
import { FileTokenStorage } from "./token_file";

test.serial.afterEach(() => {
  restore();
});

class ErrnoException extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

test.serial("FileTokenStorage no existing token", async (t) => {
  const readFile = fake.throws(new ErrnoException("not found", "ENOENT"));
  replace(fs, "readFile", readFile);

  const reset = new Subject<void>();
  const fts = await FileTokenStorage.init("/some/file", reset);

  t.is(fts.token, undefined);
});

test.serial("FileTokenStorage read existing token", async (t) => {
  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const reset = new Subject<void>();
  const fts = await FileTokenStorage.init("/some/file", reset);

  t.is(fts.token, "123");
});

test.serial("FileTokenStorage update token", async (t) => {
  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const writeFile = fake.resolves(undefined);
  replace(fs, "writeFile", writeFile);

  const reset = new Subject<void>();
  const fts = await FileTokenStorage.init("/some/file", reset);

  t.is(fts.token, "123");

  await fts.updateToken("456");

  t.is(fts.token, "456");
  t.deepEqual(writeFile.args[0], ["/some/file", "456"]);
});

test.serial("FileTokenStorage clear token", async (t) => {
  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const unlink = fake.resolves(undefined);
  replace(fs, "unlink", unlink);

  const reset = new Subject<void>();
  const fts = await FileTokenStorage.init("/some/file", reset);

  t.is(fts.token, "123");

  await fts.clearToken();

  t.is(fts.token, undefined);
  t.deepEqual(unlink.args[0], ["/some/file"]);
});

test.serial("FileTokenStorage reset token", async (t) => {
  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const unlink = fake.resolves(undefined);
  replace(fs, "unlink", unlink);

  const reset = new Subject<void>();
  const fts = await FileTokenStorage.init("/some/file", reset);

  t.is(fts.token, "123");

  reset.next();
  await nextTick();

  t.is(fts.token, undefined);
  t.deepEqual(unlink.args[0], ["/some/file"]);
});

test.serial("FileTokenStorage sub to token", async (t) => {
  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const writeFile = fake.resolves(undefined);
  replace(fs, "writeFile", writeFile);

  const unlink = fake.resolves(undefined);
  replace(fs, "unlink", unlink);

  const reset = new Subject<void>();
  const fts = await FileTokenStorage.init("/some/file", reset);

  const vals: (string | undefined)[] = [];
  fts.tokens.subscribe({
    next: (val) => vals.push(val),
  });

  t.deepEqual(vals, ["123"]);

  await fts.updateToken("456");

  t.deepEqual(vals, ["123", "456"]);

  await fts.updateToken("456");

  t.deepEqual(vals, ["123", "456"]);

  await fts.clearToken();

  t.deepEqual(vals, ["123", "456", undefined]);
});

test.serial("FileTokenStorage fail to read existing token", async (t) => {
  const logs = await captureLogsAsync(async function () {
    const readFile = fake.throws(new Error("nope"));
    replace(fs, "readFile", readFile);
    await FileTokenStorage.init("/some/file", new Subject<void>());
  });

  textHasLog(t, logs, "error", "read token file");
});

test.serial("FileTokenStorage fail to update token", async (t) => {
  const logs = await captureLogsAsync(async function () {
    const readFile = fake.resolves("123");
    replace(fs, "readFile", readFile);
    const writeFile = fake.throws(new Error("nope"));
    replace(fs, "writeFile", writeFile);
    const reset = new Subject<void>();
    const fts = await FileTokenStorage.init("/some/file", reset);
    await fts.updateToken("456");
    t.deepEqual(writeFile.args[0], ["/some/file", "456"]);
  });

  textHasLog(t, logs, "error", "write token file");
});

test.serial("FileTokenStorage fail to clear token", async (t) => {
  const logs = await captureLogsAsync(async function () {
    const readFile = fake.resolves("123");
    replace(fs, "readFile", readFile);
    const unlink = fake.throws(new Error("nope"));
    replace(fs, "unlink", unlink);
    const reset = new Subject<void>();
    const fts = await FileTokenStorage.init("/some/file", reset);
    await fts.clearToken();
  });

  textHasLog(t, logs, "error", "delete token file");
});

test.serial("TokenProvider with existing token", async (t) => {
  const { tp } = setupTokenProvider();

  t.is(tp.tokens.getValue(), "123");
});

test.serial("TokenProvider without existing token", async (t) => {
  const { tp } = setupTokenProvider({ initToken: undefined });
  tp.tokens;

  t.is(tp.tokens.getValue(), undefined);
});

test.serial("TokenProvider no token, taj connect", async (t) => {
  const { tp, cbs } = setupTokenProvider({ initToken: undefined });
  tp.tokens;

  t.is(tp.tokens.getValue(), undefined);

  cbs["connected"]![0]!();

  await nextTick();

  t.is(tp.tokens.getValue(), "abc");
});

test.serial("TokenProvider no token, taj connect, failed", async (t) => {
  const logs = await captureLogsAsync(async function () {
    const { tp, cbs } = setupTokenProvider({
      initToken: undefined,
      failRegisterService: true,
    });
    tp.tokens;

    t.is(tp.tokens.getValue(), undefined);

    cbs["connected"]![0]!();

    await nextTick();

    t.is(tp.tokens.getValue(), undefined);
  });

  textHasLog(t, logs, "error", "register service");
});

test.serial("TokenProvider stop", async (t) => {
  const { tp, cbs } = setupTokenProvider({ initToken: undefined });
  tp.tokens;

  t.is(tp.tokens.getValue(), undefined);

  tp.stop();

  cbs["connected"]![0]!();

  await nextTick();

  t.is(tp.tokens.getValue(), undefined);

  tp.stop();

  t.is(tp.tokens.getValue(), undefined);
});
