import { Participant as Ptpt, Tajriba } from "@empirica/tajriba";
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

  globalAttributes(url: string) {
    const taj = new Tajriba(url);

    let subs: Sub[] = [];
    const attrs = {};
    taj.globalAttributes((payload, err) => {
      if (err) {
        console.error("golbal attributes error:");
        console.error(err);
        return;
      }

      console.log(payload);
    });

    return {
      subscribe: (subscription: Sub) => {
        subs.push(subscription);
        subscription(attrs);

        return () => {
          subs = subs.filter((s) => s !== subscription);
        };
      },
    };
  },
};

type Sub = (value: Object) => void;
