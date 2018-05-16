import { Conditions } from "../conditions.js";
import { config } from "../../../../experiment/server";
import { SimpleSchema } from "simpl-schema/dist/SimpleSchema";

Meteor.publish("admin-conditions", function() {
  if (!this.userId) {
    return null;
  }

  return [Conditions.find()];
});

Meteor.publish("admin-condition-types", function() {
  if (!this.userId) {
    return null;
  }

  const conditions = _.clone(config.conditions);
  _.each(conditions, (value, key) => {
    switch (value.type) {
      case String:
        value.stringType = "String";
        break;
      case Boolean:
        value.stringType = "Boolean";
        break;
      case SimpleSchema.Integer:
        value.stringType = "Integer";
        break;
      case Number:
        value.stringType = "Number";
        break;
      default:
        console.error("unknown condition type: " + value.type);
        break;
    }
    this.added("condition_types", key, value);
  });

  this.ready();
});
