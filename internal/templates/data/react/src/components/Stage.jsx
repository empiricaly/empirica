import { usePlayer } from "@empirica/player";
import React from "react";
import { Button } from "./Button";

export function Stage() {
  const player = usePlayer();
  const score = player.get("score") || 0;

  function handleClick() {
    player.stage.set("submit", true);
  }

  function handleCheat() {
    player.set("score", score + 1);
  }

  return (
    <div className=" flex w-full flex-col items-center justify-center">
      {player.stage?.get("submit") ? (
        "I gave up"
      ) : (
        <>
          <div className="w-3/4">{/* <Snake percentageWidth={75} /> */}</div>

          <div className="mt-20">
            <Button handleClick={handleCheat}>Cheat</Button>
            <Button handleClick={handleClick} primary className="ml-2">
              I give up
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
