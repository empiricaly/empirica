import { useContext, useEffect, useState } from "react";
import { Observable } from "rxjs";
import { Globals } from "../globals";
import { ParticipantContext } from "../participant_context";
import { ParticipantCtx } from "./EmpiricaParticipant";

export function userParticipantContext() {
  return useContext(ParticipantCtx);
}

export function useGlobal() {
  return usePartCtxKey<Globals, "globals">("globals");
}

export function usePlayerID() {
  const ctx = userParticipantContext();
  const [playerID, setPlayerID] = useState<string | undefined>(undefined);
  const [changePlayerID, setChangePlayerID] = useState<
    ((v: string) => void) | undefined
  >(undefined);

  useEffect(() => {
    if (!ctx) {
      return;
    }

    const { unsubscribe } = ctx.session.subscribe({
      next(session) {
        if (!session) {
          setPlayerID(undefined);
          setChangePlayerID(async (playerIdentifier: string) => {
            await ctx.register(playerIdentifier);
          });
        } else {
          setPlayerID(session?.participant.identifier);
          setChangePlayerID(undefined);
        }
      },
    });

    return unsubscribe;
  });

  return [playerID, changePlayerID];
}

// useConsent,
// useGame,
// useGlobal,
// usePlayer,
// usePlayerID,
// useRound,
// useStage,

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
