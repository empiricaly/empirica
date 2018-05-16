import SimpleSchema from "simpl-schema";

import { TimestampSchema } from "../default-schemas.js";

let config;
if (Meteor.isServer) {
  config = require("../../../experiment/server/index.js").config;
} else {
  config = { conditions: [] };
}

export const Conditions = new Mongo.Collection("conditions");

Conditions.helpers({
  label() {
    let label = this.name;
    const value = String(this.value);
    if (label !== value) {
      label += ` (${value})`;
    }
    return label;
  },
  fullLabel() {
    return `${this.type}: ${this.label()}`;
  }
});

const valueValidation = function() {
  if (!Meteor.isServer) {
    return;
  }

  // check with corresponding condition def from game/server/index.js
  const key = this.field("type").value;
  const fieldConfig = config.conditions[key];
  const schema = { [key]: _.omit(fieldConfig, "description", "stringType") };
  const val = new SimpleSchema(schema).newContext();
  val.validate({ [key]: this.value });
  if (!val.isValid()) {
    this.addValidationErrors(val.validationErrors());
    return false;
  }
};

Conditions.schema = new SimpleSchema({
  // The type corresponding to the type definition in game/server/index.js
  type: {
    type: String,
    max: 256,
    regEx: /^[a-zA-Z0-9_]+$/
  },

  name: {
    type: String,
    autoValue() {
      if (!this.isSet && (this.isInsert || Meteor.isClient)) {
        return String(this.field("value").value);
      }
    },
    max: 256,
    regEx: /^[a-zA-Z0-9_\.]+$/
  },

  value: {
    type: SimpleSchema.oneOf(
      {
        type: String,
        custom: valueValidation,
        scopedUnique: "type"
      },
      {
        type: SimpleSchema.Integer,
        custom: valueValidation,
        scopedUnique: "type"
      },
      {
        type: Number,
        custom: valueValidation,
        scopedUnique: "type"
      },
      {
        type: Boolean,
        custom: valueValidation,
        scopedUnique: "type"
      }
    )
  }
});

Conditions.schema.extend(TimestampSchema);
Conditions.attachSchema(Conditions.schema);
