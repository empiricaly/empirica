import { useEffect, useState } from "react";
import { BehaviorSubject, Observable } from "rxjs";
import { ParticipantModeContext } from "../../context";
import { useParticipantContext } from "../../react/hooks";
import { StepTick } from "../../steps";
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

export function useStageTimer() {
  const stage = useStage();
  const [val, setVal] = useState<{ tick: StepTick | undefined }>({
    tick: stage?.timer?.current,
  });

  useEffect(() => {
    if (!stage || !stage.timer) {
      return;
    }

    const sub = stage.timer.obs().subscribe({
      next(val) {
        setVal({ tick: val });
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [stage]);

  return val.tick;
}

export function usePlayers() {
  return usePartModeCtxKey<EmpiricaClassicContext, "players", Player[]>(
    "players"
  );
}

export function usePartModeCtx<M>() {
  const ctx = useParticipantContext() as ParticipantModeContext<M>;
  const [mode, setMode] = useState<{ data: M | undefined }>({
    data: ctx.mode.getValue(),
  });

  useEffect(() => {
    if (!ctx || !ctx.mode) {
      return;
    }

    const sub = ctx.mode.subscribe({
      next(m) {
        setMode({ data: m });
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [ctx]);

  return mode.data;
}

export function usePartModeCtxKey<M, K extends keyof M, R>(
  name: K
): R | undefined {
  const mode = usePartModeCtx<M>();
  const iniVal =
    mode &&
    ((<unknown>mode[name]) as BehaviorSubject<R | undefined> | undefined);
  const [val, setVal] = useState<{ data: R | undefined }>({
    data: iniVal?.getValue(),
  });

  useEffect(() => {
    if (!mode) {
      return;
    }

    const obs = (<unknown>mode[name]) as Observable<R>;

    const sub = obs.subscribe({
      next(val) {
        setVal({ data: val });
      },
    });

    return sub.unsubscribe.bind(sub);
  }, [mode]);

  return val.data;
}
