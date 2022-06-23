import { useContext, useEffect, useState } from "react";
import { merge, Observable } from "rxjs";
import { TajribaConnection } from "../../shared/tajriba_connection";
import { Globals } from "../../shared/globals";
import { ParticipantContext } from "../context";
import { ParticipantCtx } from "./EmpiricaParticipant";
import { Session } from "../connection";

export function useParticipantContext() {
  return useContext(ParticipantCtx);
}

export function useTajribaConnecting() {
  return useTajribaCtxKey<boolean, "connecting">("connecting");
}

export function useTajribaConnected() {
  return useTajribaCtxKey<boolean, "connected">("connected");
}

export function useTajriba() {
  const ctx = useParticipantContext();
  return ctx?.tajriba;
}

export function useGlobal() {
  return usePartCtxKey<Globals, "globals">("globals");
}

const defaultConsentKey = "empirica:consent";

export function useConsent(
  ns: string = ""
): [boolean, (() => void) | undefined] {
  const key = `${defaultConsentKey}${ns ? `:${ns}` : ""}`;
  const getConsented = () => Boolean(window.localStorage[key]);
  const [consented, setConsented] = useState(getConsented());

  function onConsent() {
    window.localStorage[key] = true;
    setConsented(true);
  }

  return [consented, consented ? undefined : onConsent];
}

export function usePlayerID(): [
  boolean,
  string | undefined,
  ((v: string) => void) | undefined
] {
  const ctx = useParticipantContext();
  const [connecting, setConnecting] = useState<boolean>(true);
  const [playerID, setPlayerID] = useState<string | undefined>(undefined);
  const [changePlayerID, setChangePlayerID] = useState<
    ((v: string) => void) | undefined
  >(undefined);

  useEffect(() => {
    if (!ctx) {
      return;
    }

    let _connecting = true;
    let session: Session | undefined;
    const sub = merge(
      ctx.participant.connecting,
      ctx.session.sessions
    ).subscribe({
      next(sessionOrConnecting) {
        if (typeof sessionOrConnecting === "boolean") {
          setConnecting(sessionOrConnecting);
          _connecting = sessionOrConnecting;
        } else {
          session = sessionOrConnecting;
        }

        if (_connecting) {
          setPlayerID(undefined);
          setChangePlayerID(undefined);
        } else if (!session) {
          setPlayerID(undefined);
          setChangePlayerID(() => async (playerIdentifier: string) => {
            await ctx.register(playerIdentifier);
          });
        } else {
          setPlayerID(session.participant.identifier);
          setChangePlayerID(undefined);
        }
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [ctx]);

  return [connecting, playerID, changePlayerID];
}

function useTajribaCtxKey<T, K extends keyof TajribaConnection>(name: K) {
  return useCtxKey<T, TajribaConnection, K>(useTajriba, name);
}

function usePartCtxKey<T, K extends keyof ParticipantContext>(name: K) {
  return useCtxKey<T, ParticipantContext, K>(useParticipantContext, name);
}

function useCtxKey<T, O extends {}, K extends keyof O>(
  ctxFunc: () => O | undefined,
  name: K
) {
  const ctx = ctxFunc();
  const [val, setVal] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!ctx || !ctx[name]) {
      return;
    }

    const obs = (<unknown>ctx[name]) as Observable<T>;

    const sub = obs.subscribe({
      next(g) {
        setVal(g);
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [ctx]);

  return val;
}
