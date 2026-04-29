import * as React from "react";
import { useState } from "react";
import { type Api } from "../lib/api.js";

export function ParticipantsPage({ api }: { api: Api }): React.ReactElement {
  const [identifier, setIdentifier] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h2>Participants</h2>
      <p className="muted">
        Generate a participant URL token. Share the resulting link with the participant
        to grant access to the player UI.
      </p>
      {error && <p className="badge bad">{error}</p>}
      <div className="card">
        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="input"
            placeholder="Identifier (e.g., prolific:abc)"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <button
            className="btn"
            disabled={!identifier}
            onClick={async () => {
              try {
                setError(null);
                const r = await api.createParticipant(identifier);
                setLink(`${location.origin}/?p=${encodeURIComponent(r.token)}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            }}
          >
            Issue link
          </button>
          {link && (
            <div className="card" style={{ wordBreak: "break-all" }}>
              <code>{link}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
