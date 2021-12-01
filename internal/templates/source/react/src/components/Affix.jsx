import React from "react";
import { Loading, Steps, useGame, useStage } from "@empirica/player";
import { IntroOne } from "./intro-exit/IntructionStepOne";
import { IntroTwo } from "./intro-exit/IntructionStepTwo";
import { Quiz } from "./intro-exit/Quiz";
import { Lobby } from "./base/Lobby";
import { ExitSurvey } from "./intro-exit/ExitSurvey";

export function Affix({ children }) {
  return (
    <Steps
      progressKey="intro"
      doneKey="introDone"
      steps={[IntroOne, IntroTwo, Quiz]}
    >
      <PostIntro children={children} />
    </Steps>
  );
}

function PostIntro({ children }) {
  const game = useGame();
  const stage = useStage();

  if (!game) {
    return <Lobby />;
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

  return children;
}
