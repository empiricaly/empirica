// `empirica/react`
//
// React hooks + components on top of `empirica/client`. Subscribe to live
// snapshot via `useSyncExternalStore`; the client is the single source of
// truth.

import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { EmpiricaClient } from "../client/client.js";
import type { Snapshot } from "../client/store.js";

interface ContextValue {
  client: EmpiricaClient;
  /** Current player id, learned from `/api/me`. */
  playerId: string | null;
  /** Current game id (if any). */
  gameId: string | null;
}

const Ctx = createContext<ContextValue | null>(null);

export interface EmpiricaProviderProps {
  /** Base URL like "/" or "http://localhost:4321". */
  baseUrl: string;
  /** Participant token (HMAC). Usually read from URL `?p=` query. */
  token: string;
  children: React.ReactNode;
}

export function EmpiricaProvider({
  baseUrl,
  token,
  children,
}: EmpiricaProviderProps): React.ReactElement {
  const client = useMemo(
    () => new EmpiricaClient({ baseUrl, token }),
    [baseUrl, token],
  );
  const [meta, setMeta] = useState<{ playerId: string | null; gameId: string | null }>({
    playerId: null,
    gameId: null,
  });

  useEffect(() => {
    let cancelled = false;
    void client
      .getMe()
      .then((me) => {
        if (cancelled) return;
        setMeta({
          playerId: me.player?.id ?? null,
          gameId: me.player?.gameId ?? null,
        });
        client.connect();
      })
      .catch(() => {
        /* surfaced via connection state */
      });
    return () => {
      cancelled = true;
      client.disconnect();
    };
  }, [client]);

  const value: ContextValue = useMemo(
    () => ({ client, playerId: meta.playerId, gameId: meta.gameId }),
    [client, meta.playerId, meta.gameId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEmpirica(): ContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEmpirica must be inside <EmpiricaProvider>");
  return v;
}

export function useSnapshot(): Snapshot {
  const { client } = useEmpirica();
  return useSyncExternalStore(
    (cb) => client.subscribe(() => cb()),
    () => client.snapshot(),
    () => client.snapshot(),
  );
}

export function usePlayer(): {
  id: string | null;
  state: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
} {
  const { client, playerId } = useEmpirica();
  const snap = useSnapshot();
  const state = (playerId ? snap.state["player"]?.[playerId] : undefined) ?? {};
  return {
    id: playerId,
    state,
    set: (key, value) => void client.setPlayerState(key, value as never),
  };
}

export function useGame(): {
  id: string | null;
  state: Record<string, unknown>;
} {
  const { gameId } = useEmpirica();
  const snap = useSnapshot();
  const state = (gameId ? snap.state["game"]?.[gameId] : undefined) ?? {};
  return { id: gameId, state };
}

export function useStage(stageId: string | null): {
  state: Record<string, unknown>;
} {
  const snap = useSnapshot();
  const state = (stageId ? snap.state["stage"]?.[stageId] : undefined) ?? {};
  return { state };
}

export { EmpiricaClient } from "../client/client.js";
export type { Snapshot } from "../client/store.js";
