import React, { useEffect, useState } from "react";

export default function Game({ children, participant, game, player }) {
  const score = player.get("score") || 0;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (game.currentStage) {
      return game.currentStage.remaining.subscribe((n) => setSeconds(n));
    }
  }, [game.currentStage]);
  console.dir(game.currentStage);

  function handleClick() {
    player.set("score", score + 1);
  }

  if (game.state == "ended") {
    return (
      <div className="bg-empirica-50 flex flex-col items-center justify-center">
        <div>Game Over</div>
      </div>
    );
  }

  return (
    <div className="bg-empirica-50 flex flex-col items-center justify-center">
      <div className="mb-6 text-4xl">
        {game.currentStage &&
          game.currentStage.round &&
          game.currentStage.round.get("name")}
        {" > "}
        {game.currentStage ? game.currentStage.name : ""}
      </div>
      <div className="mb-20">{seconds}</div>

      <button
        onClick={handleClick}
        type="button"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
      >
        Click me
      </button>

      <div className="mt-8 font-bold text-2xl">{score}</div>

      <div className="mt-12 flex flex-col items-center">
        <h1 className="text-lg font-bold">Others</h1>
        {game.players
          .filter((p) => p.id !== player.id)
          .map((p) => (
            <div key={p.id} className="flex">
              <div>
                {/* <h4 className="text-lg font-bold">{p.id}</h4> */}
                <p className="text-lg mt-1">{p.get("score")}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
