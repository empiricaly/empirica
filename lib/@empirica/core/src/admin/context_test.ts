import test from "ava";
import fs from "fs/promises";
import { fake, replace, restore } from "sinon";
import { Constructor } from "../shared/helpers";
import {
  Context,
  ErrnoException,
  fakeTajribaConnect,
  nextTick,
  textHasLog,
} from "../shared/test_helpers";
import { captureLogsAsync } from "../utils/console";
import { AdminContext } from "./context";
import { ListenersCollector } from "./events";
import { Scope } from "./scopes";

export class Batch extends Scope<Context, Kinds> {}
export class Game extends Scope<Context, Kinds> {}
type Kinds = {
  batch: Constructor<Batch>;
  game: Constructor<Game>;
};

export const kinds = {
  batch: Batch,
  game: Game,
};

test.serial.afterEach(() => {
  restore();
});

test.serial("AdminContext init admin connection", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const ctx = new Context();

  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const admin = await AdminContext.init(
    "url",
    "/some/file",
    "callbacks",
    "token",
    ctx,
    kinds
  );

  cbs["connected"]![0]!();

  t.false(admin.adminConn!.connected.getValue());

  await nextTick();

  t.true(admin.adminConn!.connected.getValue());

  cbs["connected"]![0]!();

  t.true(admin.adminConn!.connected.getValue());
});

test.serial("AdminContext failed global scopes", async (t) => {
  const { cbs } = fakeTajribaConnect({ failScopes: true });

  const ctx = new Context();

  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  await AdminContext.init(
    "url",
    "/some/file",
    "callbacks",
    "token",
    ctx,
    kinds
  );

  const logs = await captureLogsAsync(async () => {
    cbs["connected"]![0]!();
    await nextTick();
  });

  textHasLog(t, logs, "error", "global scopeID not fetch", 2);
});

test.serial("AdminContext no global scopes", async (t) => {
  const { cbs } = fakeTajribaConnect({ noScopes: true });

  const ctx = new Context();

  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  await AdminContext.init(
    "url",
    "/some/file",
    "callbacks",
    "token",
    ctx,
    kinds
  );

  const logs = await captureLogsAsync(async () => {
    cbs["connected"]![0]!();
    await nextTick();
  });

  textHasLog(t, logs, "warn", "global scopeID not found", 2);
});

test.serial("AdminContext late admin connection", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const ctx = new Context();

  const readFile = fake.throws(new ErrnoException("not found", "ENOENT"));
  replace(fs, "readFile", readFile);

  const writeFile = fake.resolves(undefined);
  replace(fs, "writeFile", writeFile);

  const admin = await AdminContext.init(
    "url",
    "/some/file",
    "callbacks",
    "token",
    ctx,
    kinds
  );

  cbs["connected"]![0]!();

  t.false(admin.adminConn!.connected.getValue());

  await nextTick();

  t.true(admin.adminConn!.connected.getValue());
});

test.serial("AdminContext register", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const ctx = new Context();

  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const admin = await AdminContext.init(
    "url",
    "/some/file",
    "callbacks",
    "token",
    ctx,
    kinds
  );

  let called = 0;
  admin.register((_: ListenersCollector<Context, Kinds>) => {
    called++;
  });

  t.is(called, 0);

  cbs["connected"]![0]!();

  t.is(called, 0);

  await nextTick();

  t.is(called, 1);

  cbs["connected"]![0]!();

  await nextTick();

  t.is(called, 1);
});

test.serial("AdminContext register already connected", async (t) => {
  const { cbs } = fakeTajribaConnect();

  const ctx = new Context();

  const readFile = fake.resolves("123");
  replace(fs, "readFile", readFile);

  const admin = await AdminContext.init(
    "url",
    "/some/file",
    "callbacks",
    "token",
    ctx,
    kinds
  );

  cbs["connected"]![0]!();

  await nextTick();

  let called = 0;
  admin.register((_: ListenersCollector<Context, Kinds>) => {
    called++;
  });

  t.is(called, 1);
});
