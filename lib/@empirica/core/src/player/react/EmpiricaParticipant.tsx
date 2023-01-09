import React from "react";
import { Mode, ParticipantContext, ParticipantModeContext } from "../context";
import { WithChildren } from "./helpers";

export const ParticipantCtx = React.createContext<
  ParticipantContext | undefined
>(undefined);

export type EmpiricaParticipantProps = WithChildren<{
  url: string;
  ns: string;
  modeFunc?: Mode<any>;
}>;

// We want to only initialize the connection once per namespace, so we keep
// previously created connections.
// TODO: cleanup old connections.
// It's ok to just keep the previous connection for simple cases where we're
// only using one connection, but if EmpiricaParticipant is used multiple times
// on a page, and some are reset, we would be leaking connections.
const contexts: { [key: string]: ParticipantContext } = {};

export function EmpiricaParticipant({
  url,
  ns,
  modeFunc,
  children,
}: EmpiricaParticipantProps) {
  let partCtx: ParticipantContext;

  if (ns in contexts) {
    partCtx = contexts[ns]!;
  } else {
    if (modeFunc) {
      partCtx = new ParticipantModeContext(url, ns, modeFunc);
    } else {
      partCtx = new ParticipantContext(url, ns);
    }

    contexts[ns] = partCtx;
  }

  return (
    <ParticipantCtx.Provider value={partCtx}>
      {children}
    </ParticipantCtx.Provider>
  );
}
