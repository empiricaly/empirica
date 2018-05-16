// This should contain admin top level type operations like resetting the DB
// or performing other grand operations. Use with extreme caution.

import { bootstrap } from "../../startup/server/bootstrap.js";

const userColls = ["meteor_accounts_loginServiceConfiguration", "users"];
const keep = [].concat(userColls);
const keepPartial = ["treatments", "conditions", "lobby_configs"];

if (Meteor.isDevelopment || Meteor.settings.public.debug_resetDatabase) {
  Meteor.methods({
    adminResetDB(partial) {
      if (!this.userId) {
        throw new Error("unauthorized");
      }

      if (Meteor.isClient) {
        return;
      }

      const driver = MongoInternals.defaultRemoteCollectionDriver();
      const db = driver.mongo.db;

      db.listCollections().toArray(
        Meteor.bindEnvironment((err, colls) => {
          if (err) {
            console.error(err);
            return;
          }
          colls = _.sortBy(colls, c => (c.name === "players" ? 0 : 1));
          colls.forEach(collection => {
            if (keep.includes(collection.name)) {
              return;
            }
            if (partial && keepPartial.includes(collection.name)) {
              return;
            }
            const coll = driver.open(collection.name);
            coll.rawCollection().drop();
          });

          db.listCollections().toArray(
            Meteor.bindEnvironment((err, colls) => {
              if (err) {
                console.error(err);
                return;
              }
              console.info("Keeping:");
              colls.forEach(collection => {
                let extra = "";
                if (userColls.includes(collection.name)) {
                  extra = "(used by admin login system)";
                }
                console.info(" - " + collection.name, extra);
              });

              console.info("Cleared DB");
              bootstrap();
              console.info("Bootstrapped");
            })
          );
        })
      );
    }
  });
}

Meteor.startup(() => {});
