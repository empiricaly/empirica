import { Chat, useGame } from "@empirica/core/player/classic/react";

import React from "react";
import { Profile } from "./Profile";
import { Stage } from "./Stage";

export function Game() {
  const game = useGame();
  const { playerCount } = game.get("treatment");

  return (
    <div className="h-full w-full flex">
      <div className="h-full w-full flex flex-col">
        <Profile />
        <div className="h-full flex items-center justify-center">
          <Stage />
        </div>
      </div>

      {playerCount > 1 && (
        <div className="h-full w-128 border-l flex justify-center items-center">
          <Chat scope={game} attribute="chat" />
        </div>
      )}
    </div>
  );
}
