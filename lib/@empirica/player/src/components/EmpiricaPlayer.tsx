import React, { useEffect, useState } from "react";
import { Empirica } from "../empirica";
import { Player } from "../player";
import Consent from "./Consent";
import { EmpiricaContext } from "./Context";
import Loading from "./Loading";
import PlayerID from "./PlayerID";

interface EmpiricaPlayerProps {
  url?: string;
  consent?: React.ElementType | null;
  playerID?: React.ElementType;
  lobby?: React.ElementType;
  // preAssignIntroSteps?: StepsFunc;
  // introSteps?: StepsFunc;
  // exitSteps?: StepsFunc;
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

export const EmpiricaPlayer: React.FC<EmpiricaPlayerProps> = (props) => {
  const [loaded, setLoaded] = useState(false);
  const [consented, setConsented] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  let sharedPlayer: Player | undefined;

  let tokenKey = defaultTokenKey;
  let partKey = defaultPartKey;
  const ns = props.ns || "";
  const url = props.url || "http://localhost:8882/query";

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
          } finally {
            console.timeEnd("startup" + ns);
            setLoaded(true);
          }
        })();
      }
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

  if (player) {
    return (
      <EmpiricaContext.Provider value={player}>
        {props.children}
      </EmpiricaContext.Provider>
    );
  }

  if (consented || props.consent === null) {
    const onPlayerID = async (playerID: string) => {
      try {
        const [player, token] = await Empirica.registerPlayer(url, playerID);
        if (!token) {
          console.warn("empirica: logged in but no token");
        }

        sharedPlayer = player;
        setPlayer(player);

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

    if (props.playerID) {
      const PlyrID = props.playerID;
      return <PlyrID onPlayerID={onPlayerID} />;
    }

    return <PlayerID onPlayerID={onPlayerID} />;
  }

  if (props.consent) {
    const Csnt = props.consent;
    return (
      <Csnt
        onConsent={() => {
          setConsented(true);
        }}
        onRefuse={() => {
          console.log("ciao");
        }}
      />
    );
  }

  return (
    <Consent
      onConsent={() => {
        setConsented(true);
      }}
      onRefuse={() => {
        console.log("ciao");
      }}
    />
  );
};
