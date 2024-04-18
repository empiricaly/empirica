import { EmpiricaClassic } from "@empirica/core/player/classic";
import {
  EmpiricaContext,
  usePlayer,
} from "@empirica/core/player/classic/react";
import { EmpiricaMenu, EmpiricaParticipant } from "@empirica/core/player/react";
import React from "react";
import { Game } from "./Game";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("participantKey") || "";

  const { protocol, host } = window.location;
  const url = `${protocol}//${host}/query`;

  // const introSteps = function () {
  //   return [DemoIntro];
  // };
  // const introSteps = [DemoIntro];
  const introSteps = [];

  return (
    <EmpiricaParticipant url={url} ns={playerKey} modeFunc={EmpiricaClassic}>
      <div className="h-screen relative">
        <EmpiricaMenu position="bottom-left" />
        <div className="h-full overflow-auto">
          <ErrorBoundarySimple>
            <EmpiricaContext
              disableConsent
              finished={Finished}
              introSteps={introSteps}
            >
              <Game />
            </EmpiricaContext>
          </ErrorBoundarySimple>
        </div>
      </div>
    </EmpiricaParticipant>
  );
}

export function DemoIntro({ next }) {
  const player = usePlayer();

  if (player.get("treatment")) {
    console.log("player treatment found");
  }

  return (
    <div>
      <h2 data-test="intro-step">Intro</h2>

      <button data-test="submit-intro-step" onClick={next}>
        <p>Next</p>
      </button>
    </div>
  );
}
export function Finished() {
  const player = usePlayer();

  return (
    <div>
      <h2 data-test="game-finished">Finished</h2>

      <button
        data-test="replay"
        onClick={() => {
          player.set("replay", true);
        }}
      >
        Replay
      </button>
    </div>
  );
}

class ErrorBoundarySimple extends React.Component {
  state = { hasError: false };

  componentDidCatch(error) {
    console.error("Error at ErrorBoundarySimple:");
    console.error(error);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return "Failed";
    }

    return this.props.children;
  }
}
