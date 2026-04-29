import * as React from "react";
import { useState } from "react";

export function LoginPage({
  onLogin,
}: {
  onLogin(username: string, password: string): Promise<void>;
}): React.ReactElement {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
      <form
        className="card"
        style={{ minWidth: 320 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onLogin(username, password);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Admin sign-in</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="badge bad">{error}</p>}
          <button className="btn" disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
