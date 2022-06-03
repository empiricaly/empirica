import React, { useEffect, useState } from "react";
import { DefaultURL, Empirica } from "../empirica";
import { usePlayer } from "../hooks";
import { Player } from "../player";
import {
  EmpiricaContext,
  NSContext,
  OnPlayerIDContext,
  URLContext,
} from "./Context";
import { Loading } from "./Loading";

interface EmpiricaPlayerProps {
  url?: string;
  ns?: string;
}

const defaultTokenKey = "emp:part:token";
const defaultPartKey = "emp:part";

const strkeys: string[] = [];

export const clear = () => {
  for (const k of strkeys) {
    window.localStorage.removeItem(k);
  }

  window.location.href = window.location.href;
};

const WaitLoad: React.FC = (props) => {
  const player = usePlayer();

  if (!player) {
    return <Loading></Loading>;
  }

  return <>{props.children}</>;
};

export const EmpiricaPlayer: React.FC<EmpiricaPlayerProps> = (props) => {
  const [loaded, setLoaded] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  let sharedPlayer: Player | undefined;

  let tokenKey = defaultTokenKey;
  let partKey = defaultPartKey;
  const ns = props.ns || "";
  const url = props.url || DefaultURL;

  if (ns) {
    tokenKey += `:${ns}`;
    partKey += `:${ns}`;
  }

  strkeys.push(tokenKey, partKey);

  // Attempt to login with existing token

  useEffect(() => {
    console.time("startup" + ns);
    const token = window.localStorage.getItem(tokenKey) || undefined;
    if (token) {
      const participantStr = window.localStorage.getItem(partKey) || undefined;
      if (participantStr) {
        const participant = JSON.parse(participantStr);
        (async () => {
          try {
            sharedPlayer = await Empirica.sessionLogin(url, token, participant);
            setPlayer(sharedPlayer);
          } catch (e) {
            console.warn("Failed to reconnect", e);
            window.localStorage.removeItem(tokenKey);
            window.localStorage.removeItem(partKey);
          } finally {
            console.timeEnd("startup" + ns);
            setLoaded(true);
          }
        })();
      }
    } else {
      console.timeEnd("startup" + ns);
      setLoaded(true);
    }

    return () => {
      if (sharedPlayer) {
        sharedPlayer.stop();
      }
    };
  }, []);

  if (!loaded) {
    return <Loading />;
  }

  let onPlayerID = null;

  if (!player) {
    onPlayerID = async (playerID: string) => {
      try {
        const [player, token] = await Empirica.registerPlayer(url, playerID);
        if (!token) {
          console.warn("empirica: logged in but no token");
        }

        let tokenKey = defaultTokenKey;
        let partKey = defaultPartKey;

        if (ns) {
          tokenKey += `:${ns}`;
          partKey += `:${ns}`;
        }

        setPlayer(player);
        sharedPlayer = player;

        window.localStorage.setItem(tokenKey, token);
        window.localStorage.setItem(
          partKey,
          JSON.stringify({
            id: player.id,
            identifier: player.identifier,
          })
        );
      } catch (error) {
        console.error(error);
      }
    };
  }

  return (
    <OnPlayerIDContext.Provider value={onPlayerID}>
      <URLContext.Provider value={url}>
        <NSContext.Provider value={ns}>
          <EmpiricaContext.Provider value={player}>
            {props.children}
          </EmpiricaContext.Provider>
        </NSContext.Provider>
      </URLContext.Provider>
    </OnPlayerIDContext.Provider>
  );
};
