import { EmpiricaPlayer } from "@empirica/player";
import React from "react";
import "virtual:windi.css";
import { Affix } from "./components/Affix";
import { Menu } from "./components/base/Menu";
import { Game } from "./components/Game";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("playerKey") || "";

  return (
    <div className="h-screen relative">
      <Menu />
      <div className="h-full overflow-auto">
        <EmpiricaPlayer ns={playerKey}>
          <Affix>
            <Game />
          </Affix>
        </EmpiricaPlayer>
      </div>
    </div>
  );
}
