import { Sweeper, usePlayer } from "@empirica/core/player/classic/react";
import React from "react";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";

export function MineSweeper() {
  const player = usePlayer();

  function handleSubmit() {
    player.stage.set("submit", true);
  }

  return (
    <div className="md:min-w-96 lg:min-w-128 xl:min-w-192 flex flex-col items-center space-y-10">
      <Sweeper avatar={Avatar} />

      <Button handleClick={handleSubmit} primary>
        I'm done!
      </Button>
    </div>
  );
}
