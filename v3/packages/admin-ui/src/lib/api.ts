// Tiny typed REST client for the admin UI.

export interface ApiOptions {
  baseUrl?: string;
  /** Bearer JWT (admin). */
  token: string | null;
}

export interface Treatment {
  id: string;
  name: string;
  factors: Record<string, unknown>;
  version?: number;
  archived?: boolean;
}
export interface Batch {
  id: string;
  status: string;
  name: string | null;
  config: Record<string, unknown>;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}
export interface Game {
  id: string;
  batchId: string;
  status: string;
  treatment: Record<string, unknown>;
  treatmentName: string | null;
  currentStageId: string | null;
}

export class Api {
  private readonly base: string;
  private token: string | null;

  constructor(opts: ApiOptions) {
    this.base = opts.baseUrl ?? "";
    this.token = opts.token;
  }

  setToken(t: string | null): void {
    this.token = t;
  }

  async devLogin(username: string, password: string): Promise<string> {
    const r = await fetch(`${this.base}/api/auth/dev`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) throw new ApiError(r.status, await safeText(r));
    const j = (await r.json()) as { token: string };
    this.token = j.token;
    return j.token;
  }

  async listTreatments(): Promise<Treatment[]> {
    const j = await this.get<{ treatments: Treatment[] }>("/api/admin/treatments");
    return j.treatments;
  }
  async createTreatment(input: { name: string; factors: Record<string, unknown> }): Promise<Treatment> {
    return this.post("/api/admin/treatments", input);
  }
  async listBatches(): Promise<Batch[]> {
    const j = await this.get<{ batches: Batch[] }>("/api/admin/batches");
    return j.batches;
  }
  async createBatch(input: {
    name?: string;
    slots: { treatmentId: string; count: number }[];
  }): Promise<Batch> {
    return this.post("/api/admin/batches", input);
  }
  async startBatch(id: string): Promise<Batch> {
    return this.post(`/api/admin/batches/${id}/start`, {});
  }
  async endBatch(id: string): Promise<Batch> {
    return this.post(`/api/admin/batches/${id}/end`, {});
  }
  async listGames(batchId: string): Promise<Game[]> {
    const j = await this.get<{ games: Game[] }>(`/api/admin/batches/${batchId}/games`);
    return j.games;
  }
  async createParticipant(identifier: string, batchId?: string): Promise<{ token: string; participant: { id: string; identifier: string } }> {
    return this.post("/api/admin/participants", batchId ? { identifier, batchId } : { identifier });
  }

  private async get<T>(path: string): Promise<T> {
    const r = await fetch(`${this.base}${path}`, { headers: this.authHeaders() });
    if (!r.ok) throw new ApiError(r.status, await safeText(r));
    return (await r.json()) as T;
  }
  private async post<T>(path: string, body: unknown): Promise<T> {
    const r = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers: { ...this.authHeaders(), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new ApiError(r.status, await safeText(r));
    return (await r.json()) as T;
  }
  private authHeaders(): Record<string, string> {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return r.statusText;
  }
}
