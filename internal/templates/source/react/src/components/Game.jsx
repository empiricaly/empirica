import { Loading, Steps, useGame, useStage } from "@empirica/player";
import React from "react";
import { Lobby } from "./base/Lobby";
import { ExitSurvey } from "./ExitSurvey";
import { Profile } from "./Profile";
import { Stage } from "./Stage";
import { Timer } from "./Timer";

export function Game() {
  const game = useGame();
  const stage = useStage();

  if (!game) {
    return <Lobby></Lobby>;
  }

  if (!stage) {
    return <Loading />;
  }

  if (game.state == "ended") {
    return (
      <Steps progressKey="exitStep" doneKey="exitStepDone" steps={[ExitSurvey]}>
        <div className="flex flex-col items-center justify-center">
          <h2 className="font-medium text-gray-700">Finished</h2>
          <p className="text-gray-400">Thank you for participating</p>
        </div>
      </Steps>
    );
  }

  return (
    <>
      <div className="absolute">
        <Timer />
      </div>
      <div className="flex items-center justify-center">
        <Profile />
        <Stage />
      </div>
    </>
  );
}
