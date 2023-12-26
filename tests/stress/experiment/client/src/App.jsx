import { EmpiricaClassic } from "@empirica/core/player/classic";
import { EmpiricaContext } from "@empirica/core/player/classic/react";
import { EmpiricaMenu, EmpiricaParticipant } from "@empirica/core/player/react";
import React from "react";
import { Game } from "./Game";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerKey = urlParams.get("participantKey") || "";

  const { protocol, host } = window.location;
  const url = `${protocol}//${host}/query`;

  return (
    <EmpiricaParticipant url={url} ns={playerKey} modeFunc={EmpiricaClassic}>
      <div className="h-screen relative">
        <EmpiricaMenu position="bottom-left" />
        <div className="h-full overflow-auto">
          <EmpiricaContext disableConsent finished={Finished}>
            <ErrorBoundarySimple>
              <Game />
            </ErrorBoundarySimple>
          </EmpiricaContext>
        </div>
      </div>
    </EmpiricaParticipant>
  );
}

export function Finished() {
  return (
    <div>
      <h2 data-test="game-finished">Finished</h2>
    </div>
  );
}

class ErrorBoundarySimple extends React.Component {
  state = { hasError: false };

  componentDidCatch(error) {
    // report the error to your favorite Error Tracking tool (ex: Sentry, Bugsnag)
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
