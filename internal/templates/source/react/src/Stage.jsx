import { usePlayer, useRound } from "@empirica/player";
import React from "react";
import { JellyBeans } from "./examples/JellyBeans";

export function Stage() {
  const player = usePlayer();
  const round = useRound();

  if (player.stage.get("submit")) {
    return (
      <div className="text-center text-gray-400">
        Please wait for other player(s).
      </div>
    );
  }

  switch (round.get("task")) {
    case "jellybeans":
      return <JellyBeans />;
    default:
      return <div>Unknown task</div>;
  }
}
