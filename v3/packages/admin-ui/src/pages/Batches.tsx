import * as React from "react";
import { useEffect, useState } from "react";
import { type Api, type Batch, type Game, type Treatment } from "../lib/api.js";

export function BatchesPage({ api }: { api: Api }): React.ReactElement {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      const [b, t] = await Promise.all([api.listBatches(), api.listTreatments()]);
      setBatches(b);
      setTreatments(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 2_000);
    return () => clearInterval(t);
  }, [api]);

  return (
    <div>
      <h2>Batches</h2>
      {error && <p className="badge bad">{error}</p>}
      <NewBatchCard treatments={treatments} api={api} onCreated={refresh} />
      {batches.length === 0 ? (
        <p className="muted">No batches yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <BatchRow key={b.id} batch={b} api={api} onChange={refresh} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BatchRow({
  batch,
  api,
  onChange,
}: {
  batch: Batch;
  api: Api;
  onChange(): void;
}): React.ReactElement {
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    void api.listGames(batch.id).then(setGames).catch(() => {
      /* surfaced elsewhere */
    });
  }, [open, batch.id, api]);

  return (
    <>
      <tr>
        <td>
          <button
            className="btn secondary"
            onClick={() => setOpen((o) => !o)}
            style={{ padding: "2px 6px" }}
          >
            {open ? "▾" : "▸"}
          </button>{" "}
          {batch.name ?? <span className="muted">(unnamed)</span>}
        </td>
        <td>
          <StatusBadge status={batch.status} />
        </td>
        <td>{new Date(batch.createdAt).toLocaleString()}</td>
        <td>
          {batch.status === "created" && (
            <button
              className="btn"
              onClick={async () => {
                await api.startBatch(batch.id);
                onChange();
              }}
            >
              Start
            </button>
          )}
          {batch.status === "running" && (
            <button
              className="btn secondary"
              onClick={async () => {
                await api.endBatch(batch.id);
                onChange();
              }}
            >
              End
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4}>
            <h3 style={{ margin: "8px 0", fontSize: 14 }}>Games</h3>
            {games.length === 0 ? (
              <p className="muted">No games (start the batch to create them).</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Treatment</th>
                    <th>Status</th>
                    <th>Id</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id}>
                      <td>{g.treatmentName ?? <span className="muted">—</span>}</td>
                      <td>
                        <StatusBadge status={g.status} />
                      </td>
                      <td>
                        <code>{g.id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  let cls = "badge";
  if (status === "running") cls += " good";
  if (status === "ended" || status === "terminated" || status === "failed") cls += " bad";
  return <span className={cls}>{status}</span>;
}

function NewBatchCard({
  treatments,
  api,
  onCreated,
}: {
  treatments: Treatment[];
  api: Api;
  onCreated(): void;
}): React.ReactElement {
  const [name, setName] = useState("");
  const [slots, setSlots] = useState<{ treatmentId: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  function addSlot(): void {
    if (!treatments[0]) return;
    setSlots((s) => [...s, { treatmentId: treatments[0]!.id, count: 1 }]);
  }
  function setSlot(i: number, patch: Partial<{ treatmentId: string; count: number }>): void {
    setSlots((s) => s.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }
  function removeSlot(i: number): void {
    setSlots((s) => s.filter((_, j) => j !== i));
  }

  return (
    <div className="card">
      <h2>New batch</h2>
      {error && <p className="badge bad">{error}</p>}
      <div className="row" style={{ marginBottom: 8 }}>
        <input
          className="input"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>Treatment</th>
            <th>Count</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s, i) => (
            <tr key={i}>
              <td>
                <select
                  className="input"
                  value={s.treatmentId}
                  onChange={(e) => setSlot(i, { treatmentId: e.target.value })}
                >
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={s.count}
                  onChange={(e) => setSlot(i, { count: Math.max(1, Number(e.target.value)) })}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <button className="btn secondary" onClick={() => removeSlot(i)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn secondary" onClick={addSlot} disabled={treatments.length === 0}>
          Add slot
        </button>
        <button
          className="btn"
          disabled={slots.length === 0}
          onClick={async () => {
            try {
              setError(null);
              await api.createBatch(name ? { name, slots } : { slots });
              setName("");
              setSlots([]);
              onCreated();
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Create
        </button>
      </div>
      {treatments.length === 0 && (
        <p className="muted" style={{ marginTop: 8 }}>
          Create a treatment first.
        </p>
      )}
    </div>
  );
}
