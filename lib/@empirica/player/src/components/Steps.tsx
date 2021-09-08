import React from "react";
import { useGame, usePlayer } from "../hooks";
import { Json } from "../json";
import { EScope } from "../store";

export type StepsFunc = (treatment: Json) => React.ElementType[] | undefined;

export interface StepsProps {
  steps: React.ElementType[] | StepsFunc;
  progressKey: string;
  doneKey: string;
  object?: EScope;
}

{
  /* 
  <Steps steps=[Introduction, Challenge]>
    <Game></Game>

  </Steps>
*/
}

export const Steps: React.FC<StepsProps> = ({
  steps,
  progressKey,
  doneKey,
  object,
  children,
}) => {
  let obj: EScope;
  const player = usePlayer();
  const game = useGame();

  if (object) {
    obj = object;
  } else {
    if (!player) {
      return <></>;
    }

    obj = player;
  }

  if (obj.get(doneKey)) {
    return <>{children}</>;
  }

  let actualSteps: React.ElementType[];

  if (typeof steps === "function") {
    const res = steps(game?.treatment || {});
    if (!res) {
      obj.set(doneKey, true);

      return <>{children}</>;
    }
    actualSteps = res;
  } else {
    actualSteps = steps;
  }

  const index = (obj.get(progressKey) as number) || 0;
  if (actualSteps.length === 0 || index >= actualSteps.length) {
    obj.set(doneKey, true);

    return <>{children}</>;
  }

  const Step = actualSteps[index];

  const next = () => {
    if (index + 1 >= actualSteps.length - 1) {
      obj.set(doneKey, true);
    } else {
      obj.set(progressKey, index + 1);
    }
  };

  return <Step next={next}></Step>;
};
