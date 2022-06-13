import { useContext, useEffect, useState } from "react";
import { merge, Observable } from "rxjs";
import { Globals } from "../globals";
import { ParticipantContext, Session } from "../participant_context";
import { ParticipantCtx } from "./EmpiricaParticipant";

export function userParticipantContext() {
  return useContext(ParticipantCtx);
}

export function useGlobal() {
  return usePartCtxKey<Globals, "globals">("globals");
}

export function usePlayerID() {
  const ctx = userParticipantContext();
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
          setPlayerID(session?.participant.identifier);
          setChangePlayerID(undefined);
        }
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [ctx]);

  return [connecting, playerID, changePlayerID];
}

function usePartCtxKey<T, K extends keyof ParticipantContext>(name: K) {
  const ctx = userParticipantContext();
  const [val, setVal] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!ctx || !ctx[name]) {
      return;
    }

    const obs = (<unknown>ctx[name]) as Observable<T>;

    const { unsubscribe } = obs.subscribe({
      next(g) {
        setVal(g);
      },
    });

    return unsubscribe;
  }, [ctx]);

  return val;
}
