import * as React from "react";
import {
  EmpiricaProvider,
  useEmpirica,
  useGame,
  usePlayer,
} from "empirica/react";

export function App(): React.ReactElement {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("p");
  if (!token) {
    return <p>Missing participant token. Add `?p=&lt;token&gt;` to the URL.</p>;
  }

  return (
    <EmpiricaProvider baseUrl={window.location.origin} token={token}>
      <Inner />
    </EmpiricaProvider>
  );
}

function Inner(): React.ReactElement {
  const { playerId, gameId } = useEmpirica();
  const player = usePlayer();
  const game = useGame();

  if (!playerId) return <p>Connecting…</p>;
  if (!gameId) return <p>Waiting for assignment…</p>;
  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Hello, player {playerId}</h1>
      <p>Game: {gameId}</p>
      <p>
        Score: <code>{String(player.state["score"] ?? 0)}</code>
      </p>
      <button
        onClick={() =>
          player.set("score", Number(player.state["score"] ?? 0) + 1)
        }
      >
        +1
      </button>
      <pre style={{ marginTop: 16 }}>{JSON.stringify(game.state, null, 2)}</pre>
    </div>
  );
}
