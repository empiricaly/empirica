// See https://www.npmjs.com/package/loglevel for logging docs
import * as logging from "loglevel";

const log = logging.getLogger("main");

// Fallback level if none is set in config file
log.setDefaultLevel(Meteor.isDevelopment ? "info" : "warn");

// Log level is set in "public" so it's accessible on the client
// Valid log level strings are: trace, debug, info, warn, error or silent.
if (Meteor.settings.public.loglevel) {
  log.setLevel(Meteor.settings.public.loglevel);
}

export default log;
