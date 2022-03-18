import { Slider, usePlayer, usePlayers, useStage } from "@empirica/player";
import "@empirica/player/assets/slider.css";
import React from "react";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";

export function JellyBeans() {
  const player = usePlayer();
  const players = usePlayers();
  const stage = useStage();

  function handleChange(e) {
    player.round.set("guess", e.target.valueAsNumber);
  }

  function handleSubmit() {
    player.stage.set("submit", true);
  }

  let jelly = <JellyBeanJar />;

  if (players.length > 1) {
    jelly = (
      <div className="grid grid-cols-2 items-center">
        {jelly}
        <div>
          {players
            .filter((p) => p.id !== player.id)
            .map((p) => (
              <div key={p.id} className="py-4">
                <div className="flex items-center space-x-6">
                  <div className="h-12 w-12 shrink-0">
                    <Avatar player={p} />
                  </div>
                  <Slider
                    value={p.round.get("guess")}
                    onChange={handleChange}
                    disabled={true}
                    max={5000}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="md:min-w-96 lg:min-w-128 xl:min-w-192 flex flex-col items-center space-y-10">
      <p>Guess how many Jelly Beans are in the jar below.</p>

      {jelly}

      <Slider
        value={player.round.get("guess")}
        onChange={handleChange}
        disabled={stage.get("name") !== "Answer"}
        max={5000}
      />

      <Button handleClick={handleSubmit} primary>
        Submit
      </Button>
    </div>
  );
}

function JellyBeanJar() {
  return (
    <div className="h-96 w-96 pb-6">
      <div
        className="h-full w-full bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url(https://i.ibb.co/nDQ2nL2/jellybeans-e1557719791368.jpg)",
        }}
        alt="Jelly Beans Jar"
      />
    </div>
  );
}
