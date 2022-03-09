import callbacks from "./callbacks.js";
import { DefaultCallbacks, connect } from "@empirica/admin";

(async () => {
  // Connect will block until the program is asked to stop (SIGINT).
  await connect({ cbs: callbacks.merge(DefaultCallbacks) });
  process.exit(0);
})();
