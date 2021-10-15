import React from "react";
import { Loading, Steps, useGame, useStage } from "@empirica/player";
import { ExitSurvey } from "./ExitSurvey";
import { Profile } from "./Profile";
import { Stage } from "./Stage";

export function Game() {
  const game = useGame();
  const stage = useStage();

  if (!game) {
    return <div>Lobby here!</div>;
  }

  if (!stage) {
    return <Loading />;
  }

  if (game.state == "ended") {
    return (
      <Steps progressKey="exitStep" doneKey="exitStepDone" steps={[ExitSurvey]}>
        <div className="bg-empirica-50 flex flex-col items-center justify-center">
          <h2>Finished</h2>
          <p>Thank you for participating</p>
        </div>
      </Steps>
    );
  }

  return (
    <div className="flex">
      <Profile />
      <Stage />
    </div>
  );
}
