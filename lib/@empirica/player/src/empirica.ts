import { Tajriba, Participant as Ptpt } from "@empirica/tajriba";
import { Player } from "./player";
import { Store } from "./store";

export const Empirica = {
  async sessionLogin(url: string, sessionToken: string, participant: Ptpt) {
    const t = await Tajriba.sessionParticipant(url, sessionToken, participant);

    const s = new Store();
    const a = new Player(t, s);
    s.pushAttributeChange = a.pushAttributeChange.bind(a);
    a.start();

    return a;
  },

  async registerPlayer(
    url: string,
    playerIdentifier: string
  ): Promise<[Player, string]> {
    const taj = new Tajriba(url);
    const [t, sessionToken] = await taj.registerParticipant(playerIdentifier);
    taj.stop();

    const s = new Store();
    const a = new Player(t, s);
    s.pushAttributeChange = a.pushAttributeChange.bind(a);
    a.start();

    return [a, sessionToken];
  },
};
