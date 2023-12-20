import React, { useEffect } from "react";
import {
  useGame,
  usePlayer,
  usePlayers,
  useRound,
  useStage,
} from "@empirica/core/player/classic/react";

export function Game() {
  const game = useGame();
  const round = useRound();
  const stage = useStage();
  const player = usePlayer();
  const players = usePlayers();
  const treatment = game.get("treatment");

  useEffect(() => {
    console.log(`stage started - ${round.get("name")} - ${stage.get("name")}`);
  }, []);

  useEffect(() => {
    window.game = game;
    window.round = round;
    window.stage = stage;
    window.player = player;
    window.players = players;

    return () => {
      delete window.game;
      delete window.round;
      delete window.stage;
      delete window.player;
      delete window.players;
    };
  }, []);

  // useEffect(() => {
  //   let i = 0;
  //   const interval = setInterval(() => {
  //     round.set(`someKey ${i}`, "someValue");
  //     i++;
  //   }, 1000 / treatment.newKeyRate);

  //   return () => clearInterval(interval);
  // }, []);

  return (
    <div>
      <h1 data-test="game-started">Game started</h1>
      <h2 data-test="round-name">{round.get("name")}</h2>
      <h3 data-test="stage-name">{stage.get("name")}</h3>
      <h3 data-test="player-count">{treatment.playerCount}</h3>
    </div>
  );
}
