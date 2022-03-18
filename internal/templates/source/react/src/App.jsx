import React from "react";
import { EmpiricaPlayer, EmpiricaMenu, GameFrame } from "@empirica/player";
import "virtual:windi.css";
import { Game } from "./Game";
import { ExitSurvey } from "./intro-exit/ExitSurvey";
import { Introduction } from "./intro-exit/Introduction";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("playerKey") || "";

  return (
    <div className="h-screen relative">
      <EmpiricaMenu />
      <div className="h-full overflow-auto">
        <EmpiricaPlayer ns={playerKey}>
          <GameFrame introSteps={[Introduction]} exitSteps={[ExitSurvey]}>
            <Game />
          </GameFrame>
        </EmpiricaPlayer>
      </div>
    </div>
  );
}
