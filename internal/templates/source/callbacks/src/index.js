import { connect, StandardCallbacks } from "@empirica/admin";
import callbacks from "./callbacks.js";

(async () => {
  // Connect will block until the program is asked to stop (SIGINT).
  await connect({ cbs: callbacks.merge(StandardCallbacks) });
  process.exit(0);
})();
