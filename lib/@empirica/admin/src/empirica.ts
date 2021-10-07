import { Tajriba } from "@empirica/tajriba";
import { Admin } from "./admin";
import { Hooks } from "./hooks";
import { Runtime } from "./runtime";
import { Root, Store } from "./store";

export const Empirica = {
  async sessionLogin(url: string, sessionToken: string, hooks?: Hooks) {
    const t = await Tajriba.sessionAdmin(url, sessionToken);

    const s = new Store(<Root>{});
    const r = new Runtime(t, s);
    await r.init(hooks);
    const a = new Admin(r);

    return a;
  },

  async loginAdmin(
    url: string,
    username: string,
    password: string,
    hooks?: Hooks
  ) {
    const taj = new Tajriba(url);
    const [t, sessionToken] = await taj.login(username, password);
    taj.stop();

    const s = new Store(<Root>{});
    const r = new Runtime(t, s);
    await r.init(hooks);
    const a = new Admin(r);

    return [a, sessionToken];
  },

  async registerService(
    url: string,
    name: string,
    serviceToken: string,
    hooks?: Hooks
  ) {
    const taj = new Tajriba(url);
    const [t, sessionToken] = await taj.registerService(name, serviceToken);
    taj.stop();

    const s = new Store(<Root>{});
    const r = new Runtime(t, s);
    await r.init(hooks);
    const a = new Admin(r);

    return [a, sessionToken];
  },
};
