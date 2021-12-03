import React from "react";
import { EmpiricaPlayer, useGlobal } from "@empirica/player";
import "virtual:windi.css";
import { Menu } from "./components/base/Menu";
import { Game } from "./components/Game";
import { Affix } from "./components/Affix";

export default function App() {
  const _ = useGlobal();

  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("playerKey") || "";

  return (
    <div className="h-screen relative">
      <Menu />
      <div className="h-full overflow-auto">
        <EmpiricaPlayer ns={playerKey}>
          <div className="h-full flex justify-center">
            <Affix>
              <Game />
            </Affix>
          </div>
        </EmpiricaPlayer>
      </div>
    </div>
  );
}
