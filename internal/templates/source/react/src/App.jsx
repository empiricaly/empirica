import { EmpiricaPlayer, Steps } from "@empirica/player";
import React from "react";
import "virtual:windi.css";
import { Menu } from "./components/base/Menu";
import { Game } from "./components/Game";
import { IntroOne } from "./components/intro/IntructionStepOne";
import { IntroTwo } from "./components/intro/IntructionStepTwo";
import { Quiz } from "./components/intro/Quiz";

export default function App() {
  function getPlayerID() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const playerID = urlParams.get("playerID");
    return playerID || "";
  }

  return (
    <div className="h-screen relative">
      <Menu />
      {/* <div className="grid grid-flow-col grid-cols-1 grid-rows-1 gap-1 h-full"> */}
      <div className="h-full overflow-auto">
        <EmpiricaPlayer ns={`${getPlayerID()}`}>
          <div className="h-full flex justify-center">
            <Steps
              progressKey="intro"
              doneKey="introDone"
              steps={[IntroOne, IntroTwo, Quiz]}
            >
              <Game />
            </Steps>
          </div>
        </EmpiricaPlayer>
      </div>
    </div>
  );
}
