import * as React from "react";
import { useEffect, useState } from "react";
import { type Api, type Treatment } from "../lib/api.js";

export function TreatmentsPage({ api }: { api: Api }): React.ReactElement {
  const [list, setList] = useState<Treatment[]>([]);
  const [name, setName] = useState("");
  const [factors, setFactors] = useState('{\n  "playerCount": 1\n}');
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      setList(await api.listTreatments());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  useEffect(() => {
    void refresh();
  }, [api]);

  return (
    <div>
      <h2>Treatments</h2>
      {error && <p className="badge bad">{error}</p>}

      <div className="card">
        <h2>New treatment</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            className="input"
            placeholder="Name (e.g., solo)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="input"
            rows={6}
            value={factors}
            onChange={(e) => setFactors(e.target.value)}
          />
          <button
            className="btn"
            onClick={async () => {
              try {
                setError(null);
                const parsed = JSON.parse(factors) as Record<string, unknown>;
                await api.createTreatment({ name, factors: parsed });
                setName("");
                setFactors('{\n  "playerCount": 1\n}');
                refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              }
            }}
          >
            Create
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Factors</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>
                <code style={{ fontSize: 12 }}>{JSON.stringify(t.factors)}</code>
              </td>
              <td>{t.version ?? 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
