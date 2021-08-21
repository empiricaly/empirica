import { clear, EmpiricaParticipant, Logo } from "empirica";
import React from "react";
import Game from "./components/Game";

export default function App() {
  const conf = { cells: 1, rows: 1, cols: 1 };
  // const conf = { cells: 2, rows: 1, cols: 2 };
  // const conf = { cells: 4, rows: 1, cols: 4 };

  return (
    <div className="bg-gray-50 h-screen">
      <div
        className={`grid grid-flow-col ${
          conf.cols === 1
            ? "grid-cols-1"
            : conf.cols === 2
            ? "grid-cols-2"
            : "grid-cols-4"
        } ${conf.rows === 1 ? "grid-rows-1" : "grid-rows-2"} gap-1 h-full`}
      >
        {Array.from(Array(conf.cells)).map((_, i) => (
          <EmpiricaParticipant key={i} ns={`${i}`}>
            <Game>
              <h1>Hohoho</h1>
            </Game>
          </EmpiricaParticipant>
        ))}
      </div>
      <div onClick={clear}>
        <Logo />
      </div>
    </div>
  );
}
