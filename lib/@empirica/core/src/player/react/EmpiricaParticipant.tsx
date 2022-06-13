import React from "react";
import {
  Mode,
  ParticipantContext,
  ParticipantModeContext,
} from "../participant_context";
import { WithChildren } from "./helpers";

export const ParticipantCtx = React.createContext<
  ParticipantContext | undefined
>(undefined);

type EmpiricaParticipantProps = WithChildren<{
  url: string;
  ns: string;
  modeFunc?: Mode<any>;
}>;

export function EmpiricaParticipant({
  url,
  ns,
  modeFunc,
  children,
}: EmpiricaParticipantProps) {
  let partCtx: ParticipantContext;
  if (modeFunc) {
    partCtx = new ParticipantModeContext(url, ns, modeFunc);
  } else {
    partCtx = new ParticipantContext(url, ns);
  }

  return (
    <ParticipantCtx.Provider value={partCtx}>
      {children}
    </ParticipantCtx.Provider>
  );
}
