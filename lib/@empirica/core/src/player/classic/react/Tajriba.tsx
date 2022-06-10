import { Tajriba, TajribaParticipant } from "@empirica/tajriba";
import React, { useContext, useEffect, useState } from "react";
import { WithChildren } from "../../react/helpers";

export const TajribaContext = React.createContext<Tajriba | undefined>(
  undefined
);

export const TajribaParticipantContext = React.createContext<
  TajribaParticipant | undefined
>(undefined);

export interface TajribaConnectionProps {
  url?: string;
  children: React.ReactNode;
}

function Connecting() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div>Connecting...</div>
    </div>
  );
}

export const TajribaConnection: React.FC<TajribaConnectionProps> = ({
  url,
  children,
}) => {
  const [taj, setTaj] = useState<Tajriba | undefined>(undefined);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    let tajriba: Tajriba;
    let cancelled = false;

    const conn = () => setConnected(true);
    const disconn = () => setConnected(false);

    (async () => {
      tajriba = await Tajriba.create(url);
      if (cancelled) {
        tajriba.stop();

        return;
      }

      setTaj(tajriba);

      setConnected(tajriba.connected);
      tajriba.on("connected", conn);
      tajriba.on("disconnected", disconn);
    })();

    return () => {
      if (tajriba) {
        tajriba.off("connected", conn);
        tajriba.off("disconnected", disconn);
        tajriba.stop();
      } else {
        cancelled = true;
      }
    };
  }, [url]);

  if (!taj || !connected) {
    return <Connecting />;
  }

  return (
    <TajribaContext.Provider value={taj}>{children}</TajribaContext.Provider>
  );
};

export function TajribaParticipantConnection() {
  return null;
}

type TajribaParticipantSession = WithChildren<{}>;

export function TajribaParticipantSession({
  children,
}: TajribaParticipantSession) {
  const tajCtx = useContext(TajribaContext);
  const [tajPart, setTajPart] = useState<TajribaParticipant | undefined>(
    undefined
  );
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!tajCtx) {
      return;
    }

    let tajribaPart: TajribaParticipant;
    let cancelled = false;

    (async () => {
      tajribaPart = await tajCtx.sessionParticipant(token, participant);
      if (cancelled) {
        tajribaPart.stop();

        return;
      }

      setTaj(tajribaPart);

      setConnected(tajribaPart.connected);
      tajribaPart.on("connected", conn);
      tajribaPart.on("disconnected", disconn);
    })();

    return () => {
      if (tajribaPart) {
        tajribaPart.off("connected", conn);
        tajribaPart.off("disconnected", disconn);
        tajribaPart.stop();
      } else {
        cancelled = true;
      }
    };
  }, [tajCtx]);

  if (!tajCtx) {
    return <Connecting />;
  }

  if (!connected) {
    return <Connecting />;
  }

  return (
    <TajribaParticipantContext.Provider value={tajPart}>
      {children}
    </TajribaParticipantContext.Provider>
  );
}
