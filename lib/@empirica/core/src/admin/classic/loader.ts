import { z } from "zod";
import { ListenersCollector } from "../events";
import { ClassicKinds, Context } from "./models";

const string = z.string();

export function ClassicLoader(_: ListenersCollector<Context, ClassicKinds>) {
  _.on("start", function (ctx) {
    ctx.scopeSub({ kinds: ["batch", "player"] });
    ctx.participantsSub();
  });

  _.on("batch", "status", function (ctx, { batch, status }) {
    if (["running", "created"].includes(status)) {
      ctx.scopeSub({ kvs: [{ key: "batchID", val: batch.id }] });
    }
  });

  _.on("stage", "timerID", function (ctx, { timerID }) {
    ctx.transitionsSub(string.parse(timerID));
  });
}
