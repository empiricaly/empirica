import { EmpiricaPlayer, Steps } from "@empirica/player";
import React from "react";
import { Game } from "./components/Game";
import { Header } from "./components/Header";
import { IntroOne } from "./components/intro/IntructionStepOne";
import { IntroTwo } from "./components/intro/IntructionStepTwo";
import { Quiz } from "./components/intro/Quiz";

export default function App() {
  const conf = { cells: 1, rows: 1, cols: 1 };
  // const conf = { cells: 2, rows: 1, cols: 2 };
  // const conf = { cells: 4, rows: 2, cols: 2 };

  function getPlayerID() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const playerID = urlParams.get("playerID");
    return playerID || "";
  }

  return (
    <div className="bg-gray-50 h-screen">
      <Header />
      <div
        className={`grid grid-flow-col ${
          conf.cols === 1
            ? "grid-cols-1"
            : conf.cols === 2
            ? "grid-cols-2"
            : "grid-cols-4"
        } ${conf.rows === 1 ? "grid-rows-1" : "grid-rows-2"} gap-1 h-full`}
      >
        <EmpiricaPlayer ns={`${getPlayerID()}`}>
          <Steps
            progressKey="intro"
            doneKey="introDone"
            steps={[IntroOne, IntroTwo, Quiz] && []}
          >
            <Game />
          </Steps>
        </EmpiricaPlayer>
      </div>
    </div>
  );
}
