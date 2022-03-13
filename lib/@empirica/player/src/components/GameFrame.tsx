import React from "react";
import {
  useConsent,
  useGame,
  useGlobal,
  usePlayer,
  usePlayerID,
  useStage,
} from "../hooks";
import { isDevelopment } from "../utils/debug";
import { Consent } from "./Consent";
import { Loading } from "./Loading";
import { Lobby as DefaultLobby } from "./Lobby";
import { PlayerID } from "./PlayerID";
import { Steps } from "./Steps";

interface GameFrameProps {
  children: React.ReactNode;
  noGames?: React.ElementType;
  lobby?: React.ElementType;
  playerID?: React.ElementType;
  introSteps: React.ElementType[];
  exitSteps: React.ElementType[];
}

export function GameFrame({
  children,
  noGames: NoGames = DefaultNoGames,
  lobby = DefaultLobby,
  introSteps = [],
  exitSteps = [],
}: GameFrameProps) {
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

  if (!hasPlayer && onPlayerID) {
    return <PlayerID onPlayerID={onPlayerID} />;
  }

  if (!player) {
    return <Loading />;
  }

  return (
    <Steps progressKey="intro" doneKey="introDone" steps={introSteps}>
      <PostIntro exitSteps={exitSteps} lobby={lobby}>
        {children}
      </PostIntro>
    </Steps>
  );
}

interface PostIntroProps {
  children: React.ReactNode;
  lobby: React.ElementType;
  exitSteps: React.ElementType[];
}

export function PostIntro({
  children,
  lobby: Lobby,
  exitSteps,
}: PostIntroProps) {
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
      <Steps progressKey="exitStep" doneKey="exitStepDone" steps={exitSteps}>
        <Finished />
      </Steps>
    );
  }

  return <>{children}</>;
}

export function Finished() {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <h2 className="font-medium text-gray-700">Finished</h2>
      <p className="mt-2 text-gray-400">Thank you for participating</p>
    </div>
  );
}

export function DefaultNoGames() {
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
