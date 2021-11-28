import { usePlayer } from "@empirica/player";
import React from "react";
import { Breadcrumb } from "./Breadcrumb";
import { Button } from "./Button";
import { Slider } from "./Slider";

export function Stage() {
  const player = usePlayer();
  const score = player.round.get("score");

  function handleChange(e) {
    player.round.set("score", e.target.value);
  }

  function handleClick() {
    player.stage.set("submit", true);
  }

  return (
    <div className="lg:min-w-96 xl:min-w-148 flex flex-col">
      {player.stage?.get("submit") ? (
        <p className="text-center">Please wait for other player(s).</p>
      ) : (
        <>
          <Breadcrumb />

          <p className="mb-5">Welcome to Empirica! Try changing the slider.</p>

          <Slider value={score} onChange={handleChange} />

          <div className="mt-10">
            <Button handleClick={handleClick} primary>
              Submit
            </Button>

            {score !== null ? (
              <span className="ml-4 font-mono">{score} points</span>
            ) : (
              ""
            )}
          </div>
        </>
      )}
    </div>
  );
}
