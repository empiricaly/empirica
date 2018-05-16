import { SyncedCron } from "meteor/percolate:synced-cron";

SyncedCron.config({
  log: false,
  collectionTTL: 301
});

SyncedCron.start();
