import { useEffect, useState } from "react";
import { Observable } from "rxjs";
import { ParticipantModeContext } from "../../participant_context";
import { useParticipantContext } from "../../react/hooks";
import { EmpiricaClassicContext, Game, Player, Round, Stage } from "../classic";

export function usePlayer() {
  return usePartModeCtxKey<EmpiricaClassicContext, "player", Player>("player");
}

export function useGame() {
  return usePartModeCtxKey<EmpiricaClassicContext, "game", Game>("game");
}

export function useRound() {
  return usePartModeCtxKey<EmpiricaClassicContext, "round", Round>("round");
}

export function useStage() {
  return usePartModeCtxKey<EmpiricaClassicContext, "stage", Stage>("stage");
}

export function usePlayers() {
  return usePartModeCtxKey<EmpiricaClassicContext, "players", Player[]>(
    "players"
  );
}

export function usePartModeCtx<M>() {
  const ctx = useParticipantContext() as ParticipantModeContext<M>;
  const [mode, setMode] = useState<M | undefined>(undefined);

  useEffect(() => {
    if (!ctx) {
      return;
    }

    const sub = ctx.mode.subscribe({
      next(m) {
        setMode(m);
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [ctx]);

  return mode;
}

export function usePartModeCtxKey<M, K extends keyof M, R>(
  name: K
): R | undefined {
  const mode = usePartModeCtx<M>();
  const [val, setVal] = useState<R | undefined>(undefined);

  useEffect(() => {
    if (!mode) {
      return;
    }

    const obs = (<unknown>mode[name]) as Observable<R>;

    const sub = obs.subscribe({
      next(val) {
        setVal(val);
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [mode]);

  return val;
}
