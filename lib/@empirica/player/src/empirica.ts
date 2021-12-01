import { Participant as Ptpt, Tajriba } from "@empirica/tajriba";
import { JsonValue } from "./json";
import { Player } from "./player";
import { Store } from "./store";

export const DefaultURL = "http://localhost:3000/query";

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
    console.log("HEYO");
    const taj = new Tajriba(url);

    let subs: Sub[] = [];
    const attrs: { [key: string]: JsonValue } = {};
    taj.globalAttributes((payload, err) => {
      if (err) {
        console.error("golbal attributes error:");
        console.error(err);
        return;
      }

      const { attribute, done } = payload;
      if (attribute) {
        let val = null;
        if (attribute.val) {
          val = JSON.parse(attribute.val);
        }

        attrs[attribute.key] = val;
      }

      if (done) {
        for (const sub of subs) {
          sub(attrs);
        }
      }
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
