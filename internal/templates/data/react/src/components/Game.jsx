import { Loading, useGame, useStage } from "@empirica/player";
import React from "react";
import { Profile } from "./Profile";
import { Stage } from "./Stage";

export function Game() {
  const game = useGame();
  const stage = useStage();

  if (!stage) {
    return <Loading />;
  }

  if (game.state == "ended") {
    return (
      <div className="bg-empirica-50 flex flex-col items-center justify-center">
        <div>Game Over</div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Profile />
      <Stage />
    </div>
  );
}
