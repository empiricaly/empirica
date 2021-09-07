import { useContext, useEffect, useState } from "react";
import { EmpiricaContext } from "./components/Context";
import { Game, Player, Round, Stage } from "./store";

export function useGame() {
  const playerCtx = useContext(EmpiricaContext);
  const [game, setGame] = useState<Game | null>(
    (playerCtx && playerCtx.game) || null
  );

  let gameUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setGame(null);

      if (gameUnsub) {
        gameUnsub();
        gameUnsub = null;
      }

      return;
    }

    gameUnsub = playerCtx?.gameSub.subscribe((game) => {
      setGame(game);
    });

    return gameUnsub;
  }, [playerCtx]);

  return game;
}

export function useRound() {
  const playerCtx = useContext(EmpiricaContext);
  const [round, setRound] = useState<Round | null>(
    (playerCtx && playerCtx.round) || null
  );

  let roundUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setRound(null);

      if (roundUnsub) {
        roundUnsub();
        roundUnsub = null;
      }

      return;
    }

    roundUnsub = playerCtx?.roundSub.subscribe((round) => {
      setRound(round);
    });

    return roundUnsub;
  }, [playerCtx]);

  return round;
}

export function useStage() {
  const playerCtx = useContext(EmpiricaContext);
  const [stage, setStage] = useState<Stage | null>(
    (playerCtx && playerCtx.stage) || null
  );

  let stageUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setStage(null);

      if (stageUnsub) {
        stageUnsub();
        stageUnsub = null;
      }

      return;
    }

    stageUnsub = playerCtx?.stageSub.subscribe((stage) => {
      setStage(stage);
    });

    return stageUnsub;
  }, [playerCtx]);

  return stage;
}

export function usePlayer() {
  const playerCtx = useContext(EmpiricaContext);
  const [player, setPlayer] = useState<Player | null>(
    playerCtx ? playerCtx.player : null
  );

  let playerUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setPlayer(null);

      if (playerUnsub) {
        playerUnsub();
        playerUnsub = null;
      }

      return;
    }

    playerUnsub = playerCtx?.playerSub.subscribe((player) => {
      setPlayer(player);
    });

    return playerUnsub;
  }, [playerCtx]);

  return player;
}

export function usePlayers() {
  const playerCtx = useContext(EmpiricaContext);
  const [players, setPlayers] = useState<Player[] | null>(
    playerCtx ? playerCtx.players : null
  );

  let playersUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setPlayers(null);

      if (playersUnsub) {
        playersUnsub();
        playersUnsub = null;
      }

      return;
    }

    playersUnsub = playerCtx?.playersSub.subscribe((players) => {
      setPlayers(players);
    });

    return playersUnsub;
  }, [playerCtx]);

  return players;
}
