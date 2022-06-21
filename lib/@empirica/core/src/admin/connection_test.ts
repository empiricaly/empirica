import test from "ava";
import { restore } from "sinon";
import { nextTick, setupTokenProvider } from "../shared/test_helpers";
import { AdminConnection } from "./connection";

test.serial.afterEach(() => {
  restore();
});

test.serial("ParticipantConnection existing conn and token", async (t) => {
  const { cbs, tp, taj, strg, resetToken } = setupTokenProvider();

  cbs["connected"]![0]!();

  t.is(tp.tokens.getValue(), "123");

  const admin = new AdminConnection(taj, strg.tokens, resetToken);

  t.is(admin.connecting.getValue(), true);
  t.is(admin.admin.getValue(), undefined);

  // Wait for session establishement
  await nextTick();

  t.is(taj.connected.getValue(), true);
  t.not(tp.token, undefined);
  t.is(admin.connected.getValue(), true);
  t.is(admin.connecting.getValue(), false);
  t.not(admin.admin.getValue(), undefined);
});

test.serial("ParticipantConnection token and no conn", async (t) => {
  const { cbs, tp, taj, strg, resetToken } = setupTokenProvider();

  const admin = new AdminConnection(taj, strg.tokens, resetToken);

  t.is(admin.connecting.getValue(), false);

  // Wait for session establishement
  await nextTick();

  t.not(tp.token, undefined);
  t.is(taj.connected.getValue(), false);
  t.is(admin.connected.getValue(), false);
  t.is(admin.connecting.getValue(), false);

  cbs["connected"]![0]!();

  t.is(admin.connecting.getValue(), true);

  // Wait for session establishement
  await nextTick();

  t.is(taj.connected.getValue(), true);
  t.is(admin.connected.getValue(), true);
  t.is(admin.connecting.getValue(), false);

  cbs["connected"]![0]!();

  t.is(taj.connected.getValue(), true);
  t.is(admin.connected.getValue(), true);
  t.is(admin.connecting.getValue(), false);
});

test.serial("ParticipantConnection conn and no token, register", async (t) => {
  const { cbs, tp, taj, strg, resetToken } = setupTokenProvider({
    initToken: null,
  });

  cbs["connected"]![0]!();

  const admin = new AdminConnection(taj, strg.tokens, resetToken);

  t.is(admin.connected.getValue(), false);
  t.is(admin.connecting.getValue(), false);

  t.is(tp.token, undefined);

  // Wait for session establishement
  await nextTick();

  t.not(tp.token, undefined);
  t.is(taj.connected.getValue(), true);
  t.is(admin.connected.getValue(), true);
  t.is(admin.connecting.getValue(), false);
});

test.serial(
  "ParticipantConnection session fail should reset token",
  async (t) => {
    const props = setupTokenProvider({ failSession: true });
    const { cbs, tp, taj, strg, resetToken } = props;

    t.is(tp.tokens.getValue(), "123");

    cbs["connected"]![0]!();

    const admin = new AdminConnection(taj, strg.tokens, resetToken);

    t.is(admin.connecting.getValue(), true);

    // Wait for session establishement
    await nextTick(10);

    t.is(taj.connected.getValue(), true);
    t.is(props.tokenReset, 1);
    t.is(admin.connected.getValue(), false);
    t.is(admin.connecting.getValue(), false);
  }
);

test.serial("ParticipantConnection stopped", async (t) => {
  const { cbs, tp, taj, strg, resetToken } = setupTokenProvider();
  cbs["connected"]![0]!();

  const admin = new AdminConnection(taj, strg.tokens, resetToken);

  // Wait for session establishement
  await nextTick();

  t.is(taj.connected.getValue(), true);
  t.is(admin.connected.getValue(), true);
  t.is(admin.connecting.getValue(), false);
  t.is(admin.stopped.getValue(), false);

  admin.stop();

  t.is(taj.connected.getValue(), true);
  t.is(admin.connected.getValue(), false);
  t.is(admin.connecting.getValue(), false);
  t.is(admin.stopped.getValue(), true);

  admin.stop();

  t.is(taj.connected.getValue(), true);
  t.is(admin.connected.getValue(), false);
  t.is(admin.connecting.getValue(), false);
  t.is(admin.stopped.getValue(), true);
});
