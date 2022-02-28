import {
  Consent,
  isDevelopment,
  Loading,
  PlayerID,
  Steps,
  useConsent,
  useGame,
  useGlobal,
  usePlayer,
  usePlayerID,
  useStage,
} from "@empirica/player";
import React from "react";
import { Lobby } from "./base/Lobby";
import { ExitSurvey } from "./intro-exit/ExitSurvey";
import { IntroOne } from "./intro-exit/IntructionStepOne";
import { IntroTwo } from "./intro-exit/IntructionStepTwo";
import { Quiz } from "./intro-exit/Quiz";

export function Affix({ children }) {
  const { experimentOpen } = useGlobal();
  const player = usePlayer();
  const game = useGame();
  const [hasPlayer, onPlayerID] = usePlayerID();
  const [consented, onConsent] = useConsent();

  if (!game && !experimentOpen) {
    return <NoGames />;
  }

  if (!consented) {
    return <Consent onConsent={onConsent} />;
  }

  if (!hasPlayer) {
    return <PlayerID onPlayerID={onPlayerID} />;
  }

  if (!player) {
    return <Loading />;
  }

  return (
    <Steps
      progressKey="intro"
      doneKey="introDone"
      steps={[IntroOne, IntroTwo, Quiz]}
    >
      <PostIntro>{children}</PostIntro>
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
        <div className="h-full flex flex-col items-center justify-center">
          <h2 className="font-medium text-gray-700">Finished</h2>
          <p className="mt-2 text-gray-400">Thank you for participating</p>
        </div>
      </Steps>
    );
  }

  return children;
}

function NoGames() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-92 flex flex-col items-center">
        <h2 className="text-gray-700 font-medium">No experiments available</h2>
        <p className="mt-2 text-gray-400 text-justify">
          There are currently no available experiments. Please wait until an
          experiment becomes available or come back at a later date.
        </p>
        {isDevelopment ? (
          <p className="mt-4 text-gray-700">
            Go to{" "}
            <a
              href="/admin"
              target="empirica-admin"
              className="text-empirica-500"
            >
              Admin
            </a>{" "}
            to get started
          </p>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
