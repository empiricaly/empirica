import { clear, EmpiricaPlayer, Logo } from "@empirica/player";
import React from "react";
import Game from "./components/Game";

export default function App() {
  // const conf = { cells: 1, rows: 1, cols: 1 };
  const conf = { cells: 2, rows: 1, cols: 2 };
  // const conf = { cells: 4, rows: 2, cols: 2 };
  console.info(conf);

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
          <EmpiricaPlayer key={i} ns={`${i}`}>
            <Game />
          </EmpiricaPlayer>
        ))}
      </div>
      <div onClick={clear}>
        <Logo />
      </div>
    </div>
  );
}
