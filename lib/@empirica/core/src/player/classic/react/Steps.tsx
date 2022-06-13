import React from "react";
import { WithChildren } from "../../react/helpers";
import { Attributable } from "../../scopes";
import { Game, Player } from "../classic";
import { useGame, usePlayer } from "./hooks";

export type StepsFunc = (props: {
  game?: Game;
  player?: Player;
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

  // Find state receiver
  if (object) {
    obj = object;
  } else if (player) {
    obj = player;
  } else {
    console.error("no receiver and no player in Steps");
    return <div>Missing attribute</div>;
  }

  // Are we already done
  if (obj.get(doneKey)) {
    return <>{children}</>;
  }

  // Static steps
  let actualSteps = steps as React.ElementType[];

  // Dynamic steps
  if (typeof steps === "function") {
    actualSteps = steps({ game, player })!;
    if (!actualSteps) {
      obj.set(doneKey, true);

      return <>{children}</>;
    }
  }

  const index = (obj.get(progressKey) as number) || 0;
  if (actualSteps.length === 0 || index >= actualSteps.length) {
    obj.set(doneKey, true);

    return <>{children}</>;
  }

  const Step = actualSteps[index];

  if (!Step) {
    console.error("missing step at index");
    return <div>Step missing</div>;
  }

  const next = () => {
    if (index + 1 >= actualSteps.length) {
      obj.set(doneKey, true);
    } else {
      obj.set(progressKey, index + 1);
    }
  };

  return <Step next={next}></Step>;
}
