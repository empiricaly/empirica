import { z } from "zod";
import { ListenersCollector } from "../events";
import { ClassicKinds, Context } from "./models";

const string = z.string();

/** ClassicLoader loads. */
export function ClassicLoader(
  /** This is the listener */
  _: ListenersCollector<Context, ClassicKinds>
) {
  _.on("start", function (ctx) {
    ctx.participantsSub();
    ctx.scopeSub({ kinds: ["batch", "player"] });
  });

  _.on("batch", "status", function (ctx, { batch, status }) {
    if (["running", "created"].includes(status)) {
      ctx.scopeSub({
        kvs: [{ key: "batchID", val: JSON.stringify(batch.id) }],
      });
    }
  });

  _.on("stage", "timerID", function (ctx, { timerID }) {
    ctx.transitionsSub(string.parse(timerID));
  });
}
