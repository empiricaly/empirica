import React from "react";
import { Consent, ConsentProps } from "../../react/Consent";
import { Finished } from "../../react/Finished";
import {
  useConsent,
  useGlobal,
  usePlayerID,
  useTajribaConnected,
} from "../../react/hooks";
import { Loading } from "../../react/Loading";
import { NoGames } from "../../react/NoGames";
import { PlayerCreate, PlayerCreateProps } from "../../react/PlayerCreate";
import { useGame, usePlayer, useRound, useStage } from "./hooks";
import { Lobby as DefaultLobby } from "./Lobby";
import { Steps } from "./Steps";

export interface EmpiricaContextProps {
  children: React.ReactNode;
  noGames?: React.ElementType;
  consent?: React.ElementType<ConsentProps>;
  playerCreate?: React.ElementType<PlayerCreateProps>;
  lobby?: React.ElementType;
  introSteps: React.ElementType[];
  exitSteps: React.ElementType[];
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
  finished: FinishedComp = Finished,
  loading: LoadingComp = Loading,
  connecting: ConnectingComp = Loading,
  children,
}: EmpiricaContextProps) {
  const tajribaConnected = useTajribaConnected();
  const globals = useGlobal();
  const player = usePlayer();
  const game = useGame();
  const [connecting, hasPlayer, onPlayerID] = usePlayerID();
  const [consented, onConsent] = useConsent();

  if (!tajribaConnected) {
    return <ConnectingComp />;
  }

  if (!game && (!globals || !globals.get("experimentOpen"))) {
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

  if (!player) {
    return <LoadingComp />;
  }

  return (
    <Steps progressKey="intro" doneKey="introDone" steps={introSteps}>
      <EmpiricaInnerContext
        exitSteps={exitSteps}
        lobby={lobby}
        finished={FinishedComp}
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
  exitSteps: React.ElementType[];
  finished: React.ElementType;
  loading: React.ElementType;
}

function EmpiricaInnerContext({
  children,
  lobby: Lobby,
  finished: Finished,
  exitSteps,
  loading: LoadingComp,
}: EmpiricaInnerContextProps) {
  const game = useGame();
  const stage = useStage();
  const round = useRound();

  if (!game) {
    return <Lobby />;
  }

  if (game.get("state") === "ended") {
    return (
      <Steps progressKey="exitStep" doneKey="exitStepDone" steps={exitSteps}>
        <Finished />
      </Steps>
    );
  }

  if (!stage || !round) {
    return <LoadingComp />;
  }

  return <>{children}</>;
}
