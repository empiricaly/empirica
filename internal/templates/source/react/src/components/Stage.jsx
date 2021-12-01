import React from "react";
import { usePlayer } from "@empirica/player";
import { Button } from "./base/Button";
import { Slider } from "./Slider";

export function Stage() {
  const player = usePlayer();

  if (player.stage.get("submit")) {
    return (
      <div className="text-center text-gray-400">
        Please wait for other player(s).
      </div>
    );
  }

  function handleChange(e) {
    player.round.set("score", e.target.valueAsNumber);
  }

  function handleClick() {
    player.stage.set("submit", true);
  }

  return (
    <div className="md:min-w-96 lg:min-w-128 xl:min-w-192 flex flex-col items-center space-y-10">
      <p>Welcome to Empirica! Try changing the slider.</p>

      <Slider value={player.round.get("score")} onChange={handleChange} />

      <Button handleClick={handleClick} primary>
        Submit
      </Button>
    </div>
  );
}
