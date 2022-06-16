import test from "ava";
import { Subject } from "rxjs";
import { restore } from "sinon";
import { UserTokenFile } from "./token_file";

test.serial.afterEach(() => {
  restore();
});

test.serial("UserTokenFile calculates session", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const resetSession = new Subject<void>();
  let tokenFile = new UserTokenFile("helloworld", resetSession);

  const vals: (string | undefined)[] = [];
  tokenFile.tokens.subscribe({
    next(token) {
      vals.push(token);
    },
  });

  t.is(tokenFile.token, undefined);
  t.is(tokenFile.participant, undefined);
  t.deepEqual(vals, [undefined]);

  tokenFile.updateSession("123", { id: "345", identifier: "567" });

  t.is(tokenFile.token, "123");
  t.deepEqual(tokenFile.participant, { id: "345", identifier: "567" });
  t.deepEqual(vals, [
    undefined,
    { token: "123", participant: { id: "345", identifier: "567" } },
  ]);
  t.deepEqual(tokenFile.session, {
    token: "123",
    participant: { id: "345", identifier: "567" },
  });

  tokenFile = new UserTokenFile("somens", resetSession);
  const vals2: (string | undefined)[] = [];
  tokenFile.tokens.subscribe({
    next(token) {
      vals2.push(token);
    },
  });

  t.is(tokenFile.token, "123");
  t.deepEqual(tokenFile.participant, { id: "345", identifier: "567" });
  t.deepEqual(vals2, [
    { token: "123", participant: { id: "345", identifier: "567" } },
  ]);

  tokenFile.clearSession();

  t.is(tokenFile.token, undefined);
  t.is(tokenFile.participant, undefined);
  t.deepEqual(vals2, [
    { token: "123", participant: { id: "345", identifier: "567" } },
    undefined,
  ]);
  t.deepEqual(tokenFile.session, undefined);

  // There's on way to listen to localStorage...
  t.deepEqual(vals, [
    undefined,
    { token: "123", participant: { id: "345", identifier: "567" } },
  ]);
});

test.serial("ParticipantSession supports namespacing", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const resetSession = new Subject<void>();
  let session = new UserTokenFile("somens", resetSession);

  t.is(session.token, undefined);
  t.is(session.participant, undefined);

  session.updateSession("123", { id: "345", identifier: "567" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });

  const session2 = new UserTokenFile("DIFFERENTNS", resetSession);

  t.is(session2.token, undefined);
  t.is(session2.participant, undefined);

  session2.updateSession("abc", { id: "cde", identifier: "efg" });

  t.is(session2.token, "abc");
  t.deepEqual(session2.participant, { id: "cde", identifier: "efg" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });
});

test.serial("UserTokenFile resets on observable reset", async (t) => {
  t.teardown(() => {
    window.localStorage.clear();
  });

  const resetSession = new Subject<void>();
  let session = new UserTokenFile("somens", resetSession);

  session.updateSession("123", { id: "345", identifier: "567" });

  t.is(session.token, "123");
  t.deepEqual(session.participant, { id: "345", identifier: "567" });

  resetSession.next();

  t.is(session.token, undefined);
  t.is(session.participant, undefined);
});
