import React from "react";
import { Consent, ConsentProps } from "../../react/Consent";
import { Finished } from "../../react/Finished";
import {
  useConsent,
  useGlobal,
  usePartConnected,
  usePlayerID,
  useTajribaConnected,
} from "../../react/hooks";
import { Loading } from "../../react/Loading";
import { NoGames } from "../../react/NoGames";
import { PlayerCreate, PlayerCreateProps } from "../../react/PlayerCreate";
import { useGame, usePlayer, useRound, useStage } from "./hooks";
import { Lobby as DefaultLobby } from "./Lobby";
import { Steps, StepsFunc } from "./Steps";

export interface EmpiricaContextProps {
  children: React.ReactNode;
  noGames?: React.ElementType;
  consent?: React.ElementType<ConsentProps>;
  playerCreate?: React.ElementType<PlayerCreateProps>;
  lobby?: React.ElementType;
  introSteps: React.ElementType[] | StepsFunc;
  exitSteps: React.ElementType[] | StepsFunc;
  finished?: React.ElementType;
  loading?: React.ElementType;
  connecting?: React.ElementType;
}

export function EmpiricaContext({
  noGames: NoGamesComp = NoGames,
  consent: ConsentComp = Consent,
  playerCreate: PlayerCreateForm = PlayerCreate,
  introSteps = [],
  lobby = DefaultLobby,
  exitSteps = [],
  finished = Finished,
  loading: LoadingComp = Loading,
  connecting: ConnectingComp = Loading,
  children,
}: EmpiricaContextProps) {
  const tajribaConnected = useTajribaConnected();
  const participantConnected = usePartConnected();
  const globals = useGlobal();
  const player = usePlayer();
  const game = useGame();
  const [connecting, hasPlayer, onPlayerID] = usePlayerID();
  const [consented, onConsent] = useConsent();

  if (!tajribaConnected) {
    return <ConnectingComp />;
  }

  if (player && player.get("ended")) {
    return <Exit exitSteps={exitSteps} finished={finished} />;
  }

  // If globals not yet loaded or we are connected to participant but player
  // hasn't loaded yet.
  if (!globals || (participantConnected && !player)) {
    return <LoadingComp />;
  }

  if (!game && !globals.get("experimentOpen")) {
    return <NoGamesComp />;
  }

  if (!consented) {
    return <ConsentComp onConsent={onConsent!} />;
  }

  if (!hasPlayer || connecting) {
    return (
      <PlayerCreateForm onPlayerID={onPlayerID!} connecting={connecting} />
    );
  }

  if (game && game.hasEnded) {
    return <Exit exitSteps={exitSteps} finished={finished} />;
  }

  if (!player) {
    return <LoadingComp />;
  }

  return (
    <Steps progressKey="intro" doneKey="introDone" steps={introSteps}>
      <EmpiricaInnerContext
        exitSteps={exitSteps}
        lobby={lobby}
        finished={finished}
        loading={LoadingComp}
      >
        {children}
      </EmpiricaInnerContext>
    </Steps>
  );
}

interface EmpiricaInnerContextProps {
  children: React.ReactNode;
  lobby: React.ElementType;
  exitSteps: React.ElementType[] | StepsFunc;
  finished: React.ElementType;
  loading: React.ElementType;
}

function EmpiricaInnerContext({
  children,
  lobby: Lobby,
  finished,
  exitSteps,
  loading: LoadingComp,
}: EmpiricaInnerContextProps) {
  const game = useGame();
  const stage = useStage();
  const round = useRound();

  if (!game) {
    return <Lobby />;
  }

  if (game.hasEnded) {
    return <Exit exitSteps={exitSteps} finished={finished} />;
  }

  if (!stage || !round) {
    return <LoadingComp />;
  }

  return <>{children}</>;
}

function Exit({
  exitSteps,
  finished: Finished,
}: {
  exitSteps: React.ElementType[] | StepsFunc;
  finished: React.ElementType;
}) {
  return (
    <Steps progressKey="exitStep" doneKey="exitStepDone" steps={exitSteps}>
      <Finished />
    </Steps>
  );
}
