import { useContext, useEffect, useState } from "react";
import { EmpiricaContext, GlobalContext, Store } from "./components/Context";
import { Game, Player, Round, Stage } from "./store";

export function useGlobal() {
  const globalCtx = useContext(GlobalContext);
  const [glob, setGlobal] = useState<{ store: Store | null }>({
    store: null,
  });

  let globalUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!globalCtx) {
      setGlobal({ store: null });

      if (globalUnsub) {
        globalUnsub();
        globalUnsub = null;
      }

      return;
    }

    globalUnsub = globalCtx?.subscribe((store) => {
      setGlobal({ store });
    });

    return globalUnsub;
  }, [globalCtx]);

  return glob.store;
}

export function useGame() {
  const playerCtx = useContext(EmpiricaContext);
  const [game, setGame] = useState<{ game: Game | null }>({
    game: playerCtx?.game || null,
  });

  let gameUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setGame({ game: null });

      if (gameUnsub) {
        gameUnsub();
        gameUnsub = null;
      }

      return;
    }

    gameUnsub = playerCtx?.gameSub.subscribe((game) => {
      setGame({ game });
    });

    return gameUnsub;
  }, [playerCtx]);

  return game.game;
}

export function useRound() {
  const playerCtx = useContext(EmpiricaContext);
  const [round, setRound] = useState<{ round: Round | null }>({
    round: playerCtx?.round || null,
  });

  let roundUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setRound({ round: null });

      if (roundUnsub) {
        roundUnsub();
        roundUnsub = null;
      }

      return;
    }

    roundUnsub = playerCtx?.roundSub.subscribe((round) => {
      setRound({ round });
    });

    return roundUnsub;
  }, [playerCtx]);

  return round.round;
}

export function useStage() {
  const playerCtx = useContext(EmpiricaContext);
  const [stage, setStage] = useState<{ stage: Stage | null }>({
    stage: playerCtx?.stage || null,
  });

  let stageUnsub: (() => void) | null = null;
  useEffect(() => {
    // console.log("useStage", playerCtx?.stage?.hash);
    if (!playerCtx) {
      setStage({ stage: null });

      if (stageUnsub) {
        stageUnsub();
        stageUnsub = null;
      }

      return;
    }

    stageUnsub = playerCtx?.stageSub.subscribe((stage) => {
      // console.log("useStage update", stage?.id);
      setStage({ stage });
    });

    return stageUnsub;
  }, [playerCtx]);

  return stage.stage;
}

export function useStageTimer() {
  const stage = useStage();
  const [remaining, setRemaining] = useState<{ remaining: number | null }>({
    remaining: stage?.remaining || null,
  });

  let unsub: (() => void) | null = null;
  useEffect(() => {
    if (!stage) {
      setRemaining({ remaining: null });

      if (unsub) {
        unsub();
        unsub = null;
      }

      return;
    }

    unsub = stage.remainingW.subscribe((remaining) => {
      setRemaining({ remaining });
    });

    return unsub;
  }, [stage]);

  return remaining.remaining;
}

export function usePlayer() {
  const playerCtx = useContext(EmpiricaContext);
  const [player, setPlayer] = useState<{ player: Player | null }>({
    player: playerCtx?.player || null,
  });

  let playerUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setPlayer({ player: null });

      if (playerUnsub) {
        playerUnsub();
        playerUnsub = null;
      }

      return;
    }

    playerUnsub = playerCtx?.playerSub.subscribe((player) => {
      setPlayer({ player });
    });

    return playerUnsub;
  }, [playerCtx]);

  return player.player;
}

export function usePlayers() {
  const playerCtx = useContext(EmpiricaContext);
  const [players, setPlayers] = useState<{ players: Player[] | null }>({
    players: playerCtx?.players || null,
  });

  let playersUnsub: (() => void) | null = null;
  useEffect(() => {
    if (!playerCtx) {
      setPlayers({ players: null });

      if (playersUnsub) {
        playersUnsub();
        playersUnsub = null;
      }

      return;
    }

    playersUnsub = playerCtx?.playersSub.subscribe((players) => {
      setPlayers({ players });
    });

    return playersUnsub;
  }, [playerCtx]);

  return players.players;
}
