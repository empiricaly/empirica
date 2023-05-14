import React, { useEffect, useState } from "react";
import { Attributable } from "../../../shared/scopes";
import { error } from "../../../utils/console";
import { WithChildren } from "../../react/helpers";
import { Game, Player } from "../classic";
import { useGame, usePlayer } from "./hooks";

export type StepsFunc = (props: {
  game?: Game | null;
  player?: Player | null;
}) => React.ElementType[] | undefined;

export type StepsProps = WithChildren<{
  steps: React.ElementType[] | StepsFunc;
  progressKey: string;
  doneKey: string;
  object?: Attributable;
}>;

export function Steps({
  steps,
  progressKey,
  doneKey,
  object,
  children,
}: StepsProps) {
  let obj: Attributable;
  const game = useGame();
  const player = usePlayer();
  const [stps, setStps] = useState<React.ElementType[]>([]);
  const [stpsSet, setStpsSet] = useState<boolean>(false);

  useEffect(() => {
    let s: React.ElementType[];
    if (typeof steps === "function") {
      s = steps({ game, player })!;
    } else {
      s = steps;
    }
    setStps(s);
    setStpsSet(true);
  }, [steps]);

  useEffect(() => {
    if (stpsSet && (!stps || stps.length === 0)) {
      obj.set(doneKey, true);
    }
  }, [stps]);

  // Find state receiver
  if (object) {
    obj = object;
  } else if (player) {
    obj = player;
  } else {
    error("no receiver and no player in Steps");
    return <div>Missing attribute</div>;
  }

  // Are we already done
  if (obj.get(doneKey)) {
    return <>{children}</>;
  }

  const index = (obj.get(progressKey) as number) || 0;

  const next = () => {
    if (index + 1 >= stps.length) {
      obj.set(doneKey, true);
    } else {
      obj.set(progressKey, index + 1);
    }
  };

  const previous = () => {
    if (index > 0) {
      obj.set(progressKey, index - 1);
    }
  };

  const Step = stps[index];
  if (!Step) {
    return <></>;
  }

  return <Step index={index} previous={previous} next={next}></Step>;
}
