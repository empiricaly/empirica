import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { Api } from "./lib/api.js";
import { LoginPage } from "./pages/Login.js";
import { BatchesPage } from "./pages/Batches.js";
import { TreatmentsPage } from "./pages/Treatments.js";
import { ParticipantsPage } from "./pages/Participants.js";

const TOKEN_KEY = "empirica.admin.token";

export function App(): React.ReactElement {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage === "undefined" ? null : localStorage.getItem(TOKEN_KEY),
  );
  const api = useMemo(() => new Api({ token }), [token]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  if (!token) {
    return (
      <LoginPage
        onLogin={async (u, p) => {
          const t = await api.devLogin(u, p);
          setToken(t);
        }}
      />
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Empirica</h1>
        <nav>
          <NavLink to="/batches" className={({ isActive }) => (isActive ? "active" : "")}>
            Batches
          </NavLink>
          <NavLink
            to="/treatments"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Treatments
          </NavLink>
          <NavLink
            to="/participants"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Participants
          </NavLink>
        </nav>
        <button
          className="btn secondary"
          style={{ marginTop: 16 }}
          onClick={() => setToken(null)}
        >
          Sign out
        </button>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/batches" replace />} />
          <Route path="/batches" element={<BatchesPage api={api} />} />
          <Route path="/treatments" element={<TreatmentsPage api={api} />} />
          <Route path="/participants" element={<ParticipantsPage api={api} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound(): React.ReactElement {
  return <p className="muted">Page not found.</p>;
}
