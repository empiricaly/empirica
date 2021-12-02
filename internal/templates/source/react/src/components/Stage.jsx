import React from "react";
import { usePlayer, useStage } from "@empirica/player";
import { Button } from "./base/Button";
import { Slider } from "./Slider";
import { Neighbors } from "./Neighbors";

export function Stage() {
  const player = usePlayer();
  const stage = useStage();

  if (player.stage.get("submit")) {
    return (
      <div className="text-center text-gray-400">
        Please wait for other player(s).
      </div>
    );
  }

  function handleChange(e) {
    player.round.set("value", e.target.valueAsNumber);
  }

  function handleSubmit() {
    player.stage.set("submit", true);
  }

  const isNeighbors = stage.get("name") === "Neighbors";

  return (
    <div className="md:min-w-96 lg:min-w-128 xl:min-w-192 flex flex-col items-center space-y-10">
      {isNeighbors ? (
        <Neighbors />
      ) : (
        <>
          <p>Welcome to Empirica! Try changing the slider.</p>

          <Slider value={player.round.get("value")} onChange={handleChange} />
        </>
      )}

      <Button handleClick={handleSubmit} primary>
        Submit
      </Button>
    </div>
  );
}
