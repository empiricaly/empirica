import SimpleSchema from "simpl-schema";

import { Conditions } from "../conditions/conditions.js";
import { TimestampSchema, ArchivedSchema } from "../default-schemas";

export const Treatments = new Mongo.Collection("treatments");

// requiredConditions hold a list of conditions keys that are required by
// Empirica core to be able to run a game.
// Required conditions are:
// -`playerCount` determines how many players participate in a game and is
//   therefore critical to run a game.
// NOTE(np) I am still not sure this is the right way to decide how many players
// should be in a game. The other potential required condition is botsCount.
// Both of these are fundamental to any game. The information about the number
// of players, whether it's human or computer players, determines many aspects
// of the game. The fact they will influence the game run similarly to other
// conditions and are decided while deciding of a batch does not mean they
// cannot be seperatly configured. I think there might be more flexibility and
// clarity if we move these 2 conditions into the UI as configuration values for
// game runs, independently of the treatment. More thought needed here.
const requiredConditions = ["playerCount"];

//
// Add playerCount to conditions if missing
//

// This is the default playerCount definition
const defaultPlayerCount = {
  description: "The Number of players participating in the given game",
  type: SimpleSchema.Integer,
  min: 1,
  max: 100
};

// We have a string version since SimpleSchema.Integer would be transformed
// to "SimpleSchema.Integer" by JSON.stringify. Better have the example output
// be something people can simply copy and paste
const defaultPlayerCountString = `{
  description: "The Number of players participating in the given game",
  type: SimpleSchema.Integer,
  min: 1,
  max: 100
};`;

// The actual conditions insert, server only
let conditionsSchema;
Meteor.startup(() => {
  if (!Meteor.isServer) {
    return;
  }

  import("../../../experiment/server").then(server => {
    const { config } = server;
    if (!config.conditions) {
      throw new Error(
        "config.conditions in game/server/index.js are required!"
      );
    }

    if (!config.conditions.playerCount) {
      console.warn(
        "no playerCount conditions defined, adding default defintion: \n" +
          defaultPlayerCountString
      );
      config.conditions.playerCount = defaultPlayerCount;
    }

    const schema = {};
    _.each(config.conditions, (condition, key) => {
      schema[key] = _.omit(condition, "description", "stringType");
    });
    conditionsSchema = new SimpleSchema(schema);
  });
});

Treatments.helpers({
  displayName() {
    return (
      this.name || _.map(this.conditions(), c => c.fullLabel()).join(" - ")
    );
  },

  condition(type) {
    return this.conditions().find(c => c.type === type);
  },

  conditions() {
    const query = { _id: { $in: this.conditionIds } };
    return Conditions.find(query).fetch();
  },

  conditionsObject() {
    const doc = {};
    this.conditions().forEach(c => (doc[c.type] = c.value));
    return doc;
  }
});

Treatments.schema = new SimpleSchema({
  // Optional experimenter given name for the treatment
  name: {
    type: String,
    max: 256,
    optional: true,
    custom() {
      if (this.isSet && Treatments.find({ name: this.value }).count() > 0) {
        return "notUnique";
      }
    }

    // regEx: /^[a-zA-Z0-9_]+$/
  },

  // Array of conditionIds
  conditionIds: {
    type: Array,
    minCount: requiredConditions.length,
    label: "Conditions",
    index: true,
    denyUpdate: true,
    // Custom validation verifies required conditions are present and that
    // there are no duplicate conditions with the same key. We cannot easily
    // verify one of each conditions is present.
    custom() {
      if (!Meteor.isServer || !this.isInsert) {
        return;
      }

      const conditions = Conditions.find({ _id: { $in: this.value } }).fetch();
      const doc = {};
      conditions.forEach(c => (doc[c.type] = c.value));

      const context = conditionsSchema.newContext();
      context.validate(doc);
      if (!context.isValid()) {
        const error = {
          name: "conditionIds",
          type: "invalid",
          details: context.validationErrors()
        };
        this.addValidationErrors([error]);
        return "invalid";
      }
    }
  },

  "conditionIds.$": {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    label: `Condition Item`,
    associatedMustExist: Conditions
  }
});

Treatments.schema.addDocValidator(({ conditionIds }) => {
  if (!this.isInsert) {
    return [];
  }
  const query = {
    conditionIds: {
      $size: conditionIds.length,
      $all: conditionIds
    }
  };
  if (Boolean(Treatments.findOne(query))) {
    return [
      {
        name: "conditionIds",
        type: "notUnique"
      }
    ];
  }
  return [];
});

Treatments.schema.extend(TimestampSchema);
Treatments.schema.extend(ArchivedSchema);
Treatments.attachSchema(Treatments.schema);
