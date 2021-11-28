import { usePlayer } from "@empirica/player";
import React from "react";
import { Avatar } from "./Avatar";
import { Neighbors } from "./Neighbors";

export function Profile() {
  const player = usePlayer();
  const score = player.get("score") || 0;

  return (
    <div className="mr-12 flex-shrink-0 w-48 pb-8 bg-empirica-100 rounded-2xl flex flex-col items-center">
      <div className="-mt-12">
        <Avatar player={player} />
      </div>

      <div className="mt-8 flex flex-col items-center">
        <h1 className="text-sm font-medium text-gray-500">Current Score</h1>
        <div className="mt-1 text-3xl font-semibold text-gray-900">{score}</div>
      </div>

      <Neighbors />
    </div>
  );
}
