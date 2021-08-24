import React, { useContext } from "react";
import { EObj } from "../actors/participant";
import { EmpiricaContext } from "../context";

interface StepsProps {
  steps: React.ElementType[];
  progressKey: string;
  doneKey: string;
  object?: EObj;
}

const Steps: React.FC<StepsProps> = ({
  steps,
  progressKey,
  doneKey,
  object,
  children,
}) => {
  let obj: EObj;

  if (object) {
    obj = object;
  } else {
    const participant = useContext(EmpiricaContext);
    if (!participant) {
      return <></>;
    }

    const player = participant.player;
    if (!player) {
      return <></>;
    }

    obj = player;
  }

  if (obj.get(doneKey)) {
    return <>{children}</>;
  }

  const index = obj.get(progressKey) || 0;
  if (steps.length === 0 || index >= steps.length) {
    obj.set(doneKey, true);

    return <>{children}</>;
  }

  const Step = steps[index];

  const next = () => {
    if (index + 1 >= steps.length - 1) {
      obj.set(doneKey, true);
    } else {
      obj.set(progressKey, index + 1);
    }
  };

  return <Step next={next}></Step>;
};

export default Steps;
