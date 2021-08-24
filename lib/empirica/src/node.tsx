import React, { useEffect, useState } from "react";
import { Game, Participant, Player } from "./actors/participant";
import Consent from "./components/Consent";
import Loading from "./components/Loading";
import Logo from "./components/Logo";
import PlayerID from "./components/PlayerID";
import Steps from "./components/Steps";
import { EmpiricaContext } from "./context";
import { Empirica } from "./empirica";
import { Json } from "./models/json";

type StepsFunc = (treatment: Json) => JSX.Element[] | undefined;

interface EmpiricaParticipantProps {
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

export const EmpiricaParticipant: React.FC<EmpiricaParticipantProps> = (
  props
) => {
  const [emp, setEmp] = useState<Empirica | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [consented, setConsented] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  let token: string | undefined;

  let tokenKey = defaultTokenKey;
  let partKey = defaultPartKey;
  const ns = props.ns || "";

  if (ns) {
    tokenKey += `:${ns}`;
    partKey += `:${ns}`;
  }

  strkeys.push(tokenKey, partKey);

  useEffect(() => {
    console.time("startup" + ns);
    token = window.localStorage.getItem(tokenKey) || undefined;
    const participantStr = window.localStorage.getItem(partKey) || undefined;
    const e = new Empirica("http://localhost:8882/query", token);
    setEmp(e);

    (async () => {
      if (participantStr) {
        const participant = JSON.parse(participantStr);
        const [part, _] = await e.registerParticipant(
          participant.identifier,
          participant.id
        );
        setParticipant(part);
      }

      console.timeEnd("startup" + ns);
      setLoaded(true);
    })();

    return () => {
      e.stop();
    };
  }, []);

  if (!loaded || !emp) {
    return <Loading />;
  }

  if (participant) {
    return (
      <EmpiricaContext.Provider value={participant}>
        <Part participant={participant}>{props.children}</Part>
      </EmpiricaContext.Provider>
    );
  }

  if (consented || props.consent === null) {
    const onPlayerID = async (playerID: string) => {
      try {
        const [part, token] = await emp.registerParticipant(playerID);
        if (token) {
          window.localStorage.setItem(tokenKey, token);
          window.localStorage.setItem(
            partKey,
            JSON.stringify({
              id: part.taj.id,
              identifier: part.taj.identifier,
            })
          );
        }

        setParticipant(part);
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

interface PartProps {
  participant: Participant;
}

const Part: React.FC<PartProps> = ({ children, participant }) => {
  if (!children) {
    return <>Failed...</>;
  }

  const [nextProps, setNextProps] = useState<{
    participant: Participant;
    game?: Game | null;
    player?: Player;
  }>({ participant });

  useEffect(() => {
    return participant.game.subscribe((gamo: Game | null) => {
      setNextProps({ participant, game: gamo, player: participant.player });
    });
  }, []);

  if (!nextProps.game || !nextProps.player) {
    return <Loading />;
  }

  return (
    <>
      {React.Children.map<React.ReactNode, React.ReactNode>(
        children,
        (child) => {
          // Checking isValidElement is the safe way and avoids a typescript
          // error too.
          if (React.isValidElement(child)) {
            return React.cloneElement(child, nextProps);
          }
          return child;
        }
      )}
    </>
  );
};

export { Consent, PlayerID, Logo, Steps };
