import {
  Participant as Prtcpt,
  Tajriba,
  TajribaAdmin,
  TajribaParticipant,
} from "tajriba";
import { NewAdmin } from "./actors/admin";
import { Participant } from "./actors/participant";
import { Service } from "./actors/service";
import { User } from "./actors/user";

export class Empirica {
  readonly taj: Tajriba;

  constructor(readonly url: string, public sessionToken?: string) {
    this.taj = new Tajriba(url, sessionToken || undefined);
  }

  async loginAdmin(username: string, password: string) {
    let a: TajribaAdmin | undefined;
    if (this.sessionToken) {
      try {
        a = await Tajriba.sessionAdmin(this.url, this.sessionToken);
      } catch (err) {
        console.warn("auth: token exprired");
      }
    }

    let sessionToken: string | undefined;
    if (!a) {
      [a, sessionToken] = await this.taj.login(username, password);
    }

    return [await NewAdmin(User, a), sessionToken];
  }

  async registerService(name: string, serviceToken: string) {
    let a: TajribaAdmin | undefined;
    if (this.sessionToken) {
      try {
        a = await Tajriba.sessionAdmin(this.url, this.sessionToken);
      } catch (err) {
        console.warn("auth: token exprired");
      }
    }

    let sessionToken: string | undefined;
    if (!a) {
      [a, sessionToken] = await this.taj.registerService(name, serviceToken);
    }

    return [await NewAdmin(Service, a), sessionToken];
  }

  async registerParticipant(
    identifier: string,
    id?: string
  ): Promise<[Participant, string | undefined]> {
    let p: TajribaParticipant | undefined;
    if (this.sessionToken) {
      if (id) {
        try {
          const part = <Prtcpt>{ id, identifier };
          p = await Tajriba.sessionParticipant(
            this.url,
            this.sessionToken,
            part
          );
        } catch (err) {
          console.warn("auth: token exprired");
        }
      } else {
        console.warn(
          "'id' is required on registerParticipant if token is passed to Empirica"
        );
      }
    }

    if (!p) {
      [p, this.sessionToken] = await this.taj.registerParticipant(identifier);
    }

    const e = new Participant(p);
    await e.start();

    return [e, this.sessionToken];
  }

  stop() {
    this.taj.stop();
  }
}
