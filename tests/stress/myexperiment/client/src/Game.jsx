import React, { useEffect } from "react";
import { useGame, useRound } from "@empirica/core/player/classic/react";

export function Game() {
  const game = useGame();
  const round = useRound();
  const { playerCount, newKeyRate } = game.get("treatment");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      round.set(`someKey ${i}`, "someValue");
      i++;
    }, 1000 / newKeyRate);

    return () => clearInterval(interval);
  }, []);

  return <div>{playerCount}</div>;
}
