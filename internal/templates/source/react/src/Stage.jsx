import {
  usePlayer,
  usePlayers,
  useRound,
} from "@empirica/core/player/classic/react";
import { Loading } from "@empirica/core/player/react";
import React from "react";
import { JellyBeans } from "./examples/JellyBeans";
import { MineSweeper } from "./examples/MineSweeper";

export function Stage() {
  const player = usePlayer();
  const players = usePlayers();
  const round = useRound();

  if (player.stage.get("submit")) {
    if (players.length === 1) {
      return <Loading />;
    }

    return (
      <div className="text-center text-gray-400 pointer-events-none">
        Please wait for other player(s).
      </div>
    );
  }

  return <TestingVectors />;

  switch (round.get("task")) {
    case "jellybeans":
      return <JellyBeans />;
    case "minesweeper":
      return <MineSweeper />;
    default:
      return <div>Unknown task</div>;
  }
}

function TestingVectors() {
  const round = useRound();

  function setupGrid() {
    if (round.get("grid")) {
      return;
    }

    console.log("Setting up grid");

    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        const cell = {
          x: i,
          y: j,
          value: 0,
        };

        round.append("grid", cell);
      }
    }
  }

  function resetGrid() {
    console.log("Resetting grid");

    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        const cell = {
          x: i,
          y: j,
          value: 0,
        };

        round.setIndex("grid", i * j, cell);
      }
    }
  }

  console.log(round.get("grid"));

  return (
    <div>
      {round.get("grid") ? (
        <div>
          <div className="grid grid-cols-25 gap-1">
            {round.get("grid").map((cell, index) => (
              <div
                key={`${cell.x}-${cell.y}`}
                className="bg-gray-200 text-center"
                style={{ width: 20, height: 20 }}
                onMouseEnter={() => {
                  round.setIndex("grid", index, {
                    ...cell,
                    value: cell.value + 1,
                  });
                }}
              >
                {cell.value}
              </div>
            ))}
          </div>
          <button onClick={resetGrid}>Reset grid</button>
        </div>
      ) : (
        <button onClick={setupGrid}>Setup grid</button>
      )}
    </div>
  );
}
