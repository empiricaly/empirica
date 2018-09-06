// This file handles index creation.
//
// You can add manual indexes below in the Meteor.startup callback. But it is
// first recommended to try and add the indexes directly to the schemas.
//
// Due to circular references in the schemas, the schemas are not always all
// composed before SimpleSchema's attempt to create indexes. Therefor we
// sometimes end up missing some indexes. The loop over all collecitons below
// is trying to remedy this problem by running index creation after a delay.
//

import inflection from "inflection";

import log from "../lib/log.js";
import { collections } from "./collections.js";

Meteor.startup(() => {
  // Add manual indexes here. Example:
  //
  // Batches.rawCollection().createIndex({
  //   "fieldname": 1
  // }, { unique: true })

  //
  // The following loop will try to add indexes marked in the Schemas
  //

  Meteor.setTimeout(() => {
    collections.forEach(coll => {
      if (!coll.schema) {
        return;
      }

      const name = inflection.titleize(coll._name);
      log.debug("Adding indexes to", name);

      for (const key in coll.schema._schema) {
        if (coll.schema._schema.hasOwnProperty(key)) {
          const def = coll.schema._schema[key];

          const desc = `"${name}" – { ${key}: { index: ${def.index} } }`;

          // No index wanted
          if (def.index === undefined) {
            continue;
          }

          // Wanting index to be removed, not supported
          if (def.index === false) {
            log.warn(`{ index: false } not supported on ${desc}`);
            continue;
          }

          // Only 1, -1 and true values supported
          if (!(def.index === true || def.index === 1 || def.index === -1)) {
            log.warn(`unknown index value on ${desc}`);
            continue;
          }

          // Add opts supported by SimpleSchema:index
          const opts = {};
          if (def.sparse === true) {
            options.sparse = true;
          }
          if (def.unique === true) {
            opts.unique = true;
          }

          let index = {};
          switch (def.index) {
            case 1:
            case true:
              index = { [key]: 1 };
              break;
            case -1:
              index = { [key]: -1 };
              break;
          }

          log.debug(
            `  - createIndex(${JSON.stringify(index)}, ${JSON.stringify(opts)})`
          );

          coll.rawCollection().createIndex(index, opts, (err, res) => {
            if (err) {
              log.error(
                `can't create index: ${name}/${JSON.stringify(index)}. ${err}`
              );
            }
          });
        }
      }
    });
  }, 1000);
});
