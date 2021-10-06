import { usePlayer } from "@empirica/player";
import React from "react";
import { Button } from "./Button";
import { Slider } from "./Slider";

export function Stage() {
  const player = usePlayer();
  const score = player.get("score") || 0;

  function handleClick() {
    player.stage.set("submit", true);
  }

  function handleChange(e) {
    player.set("score", e.target.value);
  }

  function handleCheat() {
    player.set("score", score + 1);
  }

  return (
    <div className=" flex w-full flex-col p-20">
      {player.stage?.get("submit") ? (
        <p className="text-center">Please wait for other player(s).</p>
      ) : (
        <>
          <div className="w-3/4">{/* <Snake percentageWidth={75} /> */}</div>

          <p className="mb-5">Welcome to Empirica! try changing the slider.</p>

          <Slider value={score} onChange={handleChange} />

          <div className="mt-10">
            <Button handleClick={handleClick} primary>
              Submit
            </Button>
            {/* <Button handleClick={handleCheat}>Cheat</Button> */}
          </div>
        </>
      )}
    </div>
  );
}
