import { z } from "zod";
import { ListenersCollector } from "../events";
import { ClassicKinds, Context } from "./models";

const string = z.string();

export function ClassicLoader(subs: ListenersCollector<Context, ClassicKinds>) {
  subs.on("start", function (ctx) {
    ctx.scopeSub({ kinds: ["Batch"] });
    ctx.participantsSub();
  });

  subs.on("batch", "status", function (ctx, { batch, status }) {
    if (["running", "created"].includes(status)) {
      ctx.scopeSub({ kvs: [{ key: "batchID", val: batch.id }] });
    }
  });

  subs.on("stage", "timerID", function (ctx, { timerID }) {
    ctx.transitionsSub(string.parse(timerID));
  });
}
