import { clear, EmpiricaPlayer, Logo, Steps, useGame } from "@empirica/player";
import React from "react";
import { Game } from "./components/Game";
import { IntroOne } from "./components/intro/IntructionStepOne";
import { IntroTwo } from "./components/intro/IntructionStepTwo";
import { Quiz } from "./components/intro/Quiz";

export default function App() {
  const game = useGame();

  console.log("game state", game?.state);

  // const conf = { cells: 1, rows: 1, cols: 1 };
  const conf = { cells: 2, rows: 1, cols: 2 };
  // const conf = { cells: 4, rows: 2, cols: 2 };
  // console.info(conf);

  return (
    <div className="bg-gray-50 h-screen">
      <div className="z-50 absolute bottom-2 right-3 h-10 w-10">
        <div onClick={clear}>
          <Logo />
        </div>
      </div>
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
            <Steps
              progressKey="intro"
              doneKey="introDone"
              steps={[IntroOne, IntroTwo, Quiz]}
            >
              <Game />
            </Steps>
          </EmpiricaPlayer>
        ))}
      </div>
    </div>
  );
}
