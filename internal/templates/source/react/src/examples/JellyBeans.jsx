import {
  Slider,
  usePlayer,
  usePlayers,
  useStage,
} from "@empirica/core/player/classic/react";
import React from "react";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import "../../node_modules/@empirica/core/dist/player-classic-react.css";

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

  let jelly = <JellyBeanPile />;

  const isResultStage = stage.get("name") === "Result";

  if (players.length > 1) {
    jelly = (
      <div className="grid grid-cols-2 items-center">
        {jelly}
        <div>
          {isResultStage ? (
            <>
              <div className="text-gray-500 text-2xl">You</div>
              <div className="border-b-3 border-blue-500/50 pb-2 mb-8">
                {PlayerScore(player, () => {}, isResultStage)}
              </div>
            </>
          ) : null}
          {players
            .filter((p) => p.id !== player.id)
            .map((p) => PlayerScore(p, handleChange, isResultStage))}
        </div>
      </div>
    );
  } else if (players.length == 1 && isResultStage) {
    jelly = (
      <div className="grid grid-cols-2 items-center">
        {jelly}
        <div>
          {isResultStage ? PlayerScore(player, () => {}, isResultStage) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="md:min-w-96 lg:min-w-128 xl:min-w-192 flex flex-col items-center space-y-10">
      <p>
        {isResultStage
          ? "Result"
          : "Guess how many Jelly Beans are in the pile below."}
      </p>

      {jelly}

      {!isResultStage ? (
        <Slider
          value={player.round.get("guess")}
          onChange={handleChange}
          disabled={stage.get("name") !== "Answer"}
          max={2000}
        />
      ) : null}

      <Button handleClick={handleSubmit} primary>
        Submit
      </Button>
    </div>
  );
}

function JellyBeanPile() {
  return (
    <div className="h-96 w-96 pb-6">
      <div
        className="h-full w-full bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url(https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Gimbals-Jellybeans-Pile.jpg/512px-Gimbals-Jellybeans-Pile.jpg)",
        }}
        alt="Jelly Beans Pile"
      />
    </div>
  );
}

function PlayerScore(player, onChange, isResultStage) {
  return (
    <div key={player.id} className="py-4">
      <div className="flex items-center space-x-6">
        <div className="h-12 w-12 shrink-0">
          <Avatar player={player} />
        </div>
        <Slider
          value={player.round.get("guess")}
          onChange={onChange}
          disabled={true}
          max={2000}
        />
        {isResultStage ? (
          <div className="flex flex-col items-center space-y-0.5">
            <div className="text-2xl font-semibold leading-none font-mono">
              {player.round.get("score") || 0}
            </div>
            <h1 className="text-xs font-semibold uppercase tracking-wider leading-none text-gray-400">
              Score
            </h1>
          </div>
        ) : null}
      </div>
    </div>
  );
}
