import React, { useEffect } from "react";
import { error } from "../../../utils/console";
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

  // An unmanaged game will render the children as soon as the Game is available
  // whether the round or stage are available or not. It is up to the developer
  // to handle the presence of the round and stage.
  // Everything else is still managed: the consent, the player, the intro
  // steps, the lobby, and the game.
  // This is not recommended for most games.
  // This is useful for games that want to persist render state between rounds
  // or stages. E.g. keep a video chat up between stages.
  unmanagedGame: boolean;

  // Unmanaged assignement will render the children as soon as the player is
  // connected. It is up to the developer to handle everything after the player
  // is connected: intro steps, lobby, game, round, stage and exit steps.
  unmanagedAssignment: boolean;

  // Disable the consent screen. It is up to the developer to handle the consent
  // screen.
  disableConsent: boolean;

  // Disable the NoGames screen. It is up to the developer to handle the NoGames
  // condition.
  disableNoGames: boolean;

  // Use player ID from URL the param named after playerIdParam, if present in
  // the URL. If the playerIdParam key is not present, the player creation form
  // will be shown. If you want to restrict to only logging in with a URL param,
  // set playerIdParamExclusive to true. Default is `playerID`.
  playerIdParam: string;

  // Disable the player creation form, only use the playerIdParam to log in.
  playerIdParamExclusive: boolean;
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
  unmanagedGame = false,
  unmanagedAssignment = false,
  disableConsent = false,
  disableNoGames = false,
  playerIdParam = "playerID",
  playerIdParamExclusive = false,
  children,
}: EmpiricaContextProps) {
  const tajribaConnected = useTajribaConnected();
  const participantConnected = usePartConnected();
  const globals = useGlobal();
  const player = usePlayer();
  const game = useGame();
  const [connecting, hasPlayer, onPlayerID] = usePlayerID();
  const [consented, onConsent] = useConsent();

  useEffect(() => {
    if (hasPlayer || connecting || !onPlayerID) {
      return;
    }

    if (!playerIdParam) {
      if (playerIdParamExclusive) {
        error("playerIdParamExclusive is true but playerIdParam is not set");
      }

      return;
    }

    // If we have a player ID in the URL, use it
    const urlParams = new URLSearchParams(window.location.search);
    const urlPlayerID = urlParams.get(playerIdParam);
    if (urlPlayerID) {
      onPlayerID(urlPlayerID);
    }
  }, [
    playerIdParam,
    playerIdParamExclusive,
    connecting,
    hasPlayer,
    onPlayerID,
  ]);

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

  if (!disableNoGames && !game && !globals.get("experimentOpen")) {
    return <NoGamesComp />;
  }

  if (!disableConsent && !consented) {
    return <ConsentComp onConsent={onConsent!} />;
  }

  if (!hasPlayer || connecting) {
    if (playerIdParam) {
      const urlParams = new URLSearchParams(window.location.search);
      const playerId = urlParams.get(playerIdParam);

      if (playerId) {
        return <LoadingComp />;
      }

      if (playerIdParamExclusive) {
        return <NoGamesComp />;
      }
    }

    return (
      <PlayerCreateForm onPlayerID={onPlayerID!} connecting={connecting} />
    );
  }

  if (!player) {
    return <LoadingComp />;
  }

  if (unmanagedAssignment) {
    return <>{children}</>;
  }

  if (game && game.hasEnded) {
    return <Exit exitSteps={exitSteps} finished={finished} />;
  }

  return (
    <Steps progressKey="intro" doneKey="introDone" steps={introSteps}>
      <EmpiricaInnerContext
        exitSteps={exitSteps}
        lobby={lobby}
        finished={finished}
        loading={LoadingComp}
        unmanagedGame={unmanagedGame}
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
  unmanagedGame: boolean;
}

function EmpiricaInnerContext({
  children,
  lobby: Lobby,
  finished,
  exitSteps,
  loading: LoadingComp,
  unmanagedGame = false,
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

  if (!unmanagedGame && (!stage || !round)) {
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
