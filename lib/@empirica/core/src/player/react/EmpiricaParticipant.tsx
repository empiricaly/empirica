import React from "react";
import {
  Mode,
  ParticipantContext,
  ParticipantMode,
} from "../participant_context";
import { WithChildren } from "./helpers";

export const ParticipantCtx = React.createContext<
  ParticipantContext | undefined
>(undefined);

type EmpiricaParticipantProps = WithChildren<{
  url: string;
  ns: string;
  modeFunc: Mode<any>;
}>;

export function EmpiricaParticipant({
  url,
  ns,
  modeFunc,
  children,
}: EmpiricaParticipantProps) {
  const partCtx = new ParticipantContext(url, ns);

  return (
    <ParticipantCtx.Provider value={partCtx}>
      {children}
    </ParticipantCtx.Provider>
  );
}

// const {
//   EmpiricaPlayer,
//   EmpiricaContextConsumer,
// } = createEmpiricaPlayerContent<EmpiricaClassicContext>();

// export { EmpiricaContextConsumer };

// function ret() {
//   return (
//     <EmpiricaPlayer
//       url="http..."
//       ns=""
//       modeFunc={EmpiricaClassic}
//     ></EmpiricaPlayer>
//   );
// }
