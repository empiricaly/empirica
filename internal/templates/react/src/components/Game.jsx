import React, { useEffect, useState } from "react";
import Snake from "react-simple-snake";

export default function Game({ children, participant, game, player }) {
  const score = player.get("score") || 0;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      const prevScore = player.get("score") || 0;
      const newScore = localStorage.getItem("snakeHighScore") || 0;
      if (newScore > prevScore) {
        player.set("score", Number(newScore));
      }
    }, 1000);
    return () => {
      clearInterval(int);
      localStorage.setItem("snakeHighScore", 0);
    };
  }, []);

  useEffect(() => {
    if (game.currentStage) {
      return game.currentStage.remaining.subscribe((n) => setSeconds(n));
    }
  }, [game.currentStage]);

  function handleClick() {
    player.stage.set("submit", true);
  }

  function handleCheat() {
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
    <div className=" flex">
      <div className="flex-shrink-0 p-4 bg-empirica-100 flex flex-col items-center">
        <div className="p-4">
          <nav class="hidden sm:flex" aria-label="Breadcrumb">
            <ol role="list" class="flex items-center space-x-4">
              <li>
                <div class="flex">
                  <div
                    href="#"
                    class="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    {game.currentStage &&
                      game.currentStage.round &&
                      game.currentStage.round.get("name")}
                  </div>
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <svg
                    class="flex-shrink-0 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div
                    href="#"
                    class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    {game.currentStage ? game.currentStage.name : ""}
                  </div>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <img
            class="inline-block h-10 w-10 rounded-md"
            src={`https://avatars.dicebear.com/v2/gridy/${player.id}.svg`}
            alt="Avatar"
          />
        </div>

        <div className="mt-8 flex flex-col items-center">
          <h1 className="font-monotext-lg font-bold">{seconds}</h1>
          seconds
        </div>

        <div className="mt-8 font-bold text-2xl flex flex-col items-center">
          <h1 className="text-lg font-bold">Score</h1>
          {score}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <h1 className="text-lg font-bold">Others</h1>
          {game.players
            .filter((p) => p.id !== player.id)
            .map((p) => (
              <div key={p.id} className="flex">
                <div className="mt-1 flex items-center">
                  {/* <h4 className="text-lg font-bold">{p.id}</h4> */}
                  <img
                    class="inline-block h-4 w-4 rounded-md"
                    src={`https://avatars.dicebear.com/v2/gridy/${p.id}.svg`}
                    alt="Avatar"
                  />
                  <p className="text-lg ml-1">{p.get("score")}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {player.stage?.get("submit") ? (
        <div className=" flex w-full flex-col items-center justify-center">
          I gave up
        </div>
      ) : (
        <div className=" flex w-full flex-col items-center justify-center">
          <div className="w-3/4">
            <Snake percentageWidth={75} />
          </div>

          <div className="mt-20">
            <button
              onClick={handleCheat}
              type="button"
              className="inline-flex inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
            >
              Cheat
            </button>
            <button
              onClick={handleClick}
              type="button"
              className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
            >
              I surrender
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
