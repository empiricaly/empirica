import { usePlayer } from "@empirica/player";
import React from "react";
import { Avatar } from "./Avatar";
import { Breadcrumb } from "./Breadcrumb";
import { Neighbors } from "./Neighbors";
import { Timer } from "./Timer";

export function Profile() {
  const player = usePlayer();
  const score = player.get("score") || 0;

  return (
    <div className="flex-shrink-0 p-4 bg-empirica-100 flex flex-col items-center">
      <Breadcrumb />

      <Avatar player={player} />

      <Timer />

      <div className="mt-8 font-bold text-2xl flex flex-col items-center">
        <h1 className="text-lg font-bold">Score</h1>
        {score}
      </div>

      <Neighbors />
    </div>
  );
}
