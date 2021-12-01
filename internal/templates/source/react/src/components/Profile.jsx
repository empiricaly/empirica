import { usePlayer, useRound, useStage } from "@empirica/player";
import React from "react";
import { Avatar } from "./base/Avatar";
import { Timer } from "./base/Timer";

export function Profile() {
  const player = usePlayer();
  const score = player.get("score") || 0;
  const round = useRound();
  const stage = useStage();

  return (
    <div className="min-w-lg md:min-w-2xl m-x-auto px-3 py-2 text-gray-500 bg-gray-100 rounded-5xl grid grid-cols-3 items-center shadow-sm">
      <div className="leading-tight ml-3">
        <div className="text-gray-500 font-medium">
          {round ? round.get("name") : ""}
        </div>
        <div className="text-gray-400">{stage ? stage.get("name") : stage}</div>
      </div>

      <Timer />

      <div className="flex space-x-2 items-center justify-end">
        <div className="flex flex-col items-center space-y-0.5">
          <div className="text-2xl font-semibold leading-none font-mono">
            {!score ? "00" : score}
          </div>
          <h1 className="text-xs font-semi-bold uppercase tracking-wider leading-none text-gray-400">
            Score
          </h1>
        </div>
        <div className="">
          <Avatar player={player} />
        </div>
      </div>
    </div>
  );
}
