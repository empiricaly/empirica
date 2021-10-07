import { useStageTimer } from "@empirica/player";
import React from "react";

export function Timer() {
  let remaining = useStageTimer();

  if (remaining === null) {
    remaining = "-";
  }

  return (
    <div className="mt-8 flex flex-col items-center">
      <h1 className="font-monotext-lg font-bold">{remaining}</h1>
      seconds
    </div>
  );
}
