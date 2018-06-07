import SimpleSchema from "simpl-schema";
import moment from "moment";

import {
  BelongsTo,
  TimestampSchema,
  UserDataSchema,
  HasManyByRef
} from "../default-schemas";
import { Games } from "../games/games";
import { PlayerStages } from "../player-stages/player-stages";
import { Rounds } from "../rounds/rounds";

export const Stages = new Mongo.Collection("stages");

Stages.helpers({
  round() {
    return Rounds.findOne(this.roundId);
  }
});

Stages.stagePaddingDuration = moment.duration(0.25, "seconds");

Stages.schema = new SimpleSchema({
  // Index represents the 0 based position of the current stage in the ordered
  // list of a all the game's stages. For display, add 1.
  index: {
    type: SimpleSchema.Integer,
    min: 0,
    max: 999999 // That's a lot of stages...
  },
  name: {
    type: String,
    max: 64
  },
  displayName: {
    type: String,
    max: 128
    // TODO Add auto value to by default copy the name into the displayName?
  },
  // This will synchronize the clients timer start time and record start time
  // for the record
  startTimeAt: {
    type: Date,
    optional: true
  },
  durationInSeconds: {
    type: SimpleSchema.Integer,
    // One day, that's a lot, but could be "weird" experiment, yet no going nuts
    // into hundreds of years for example.
    max: 24 * 60 * 60,
    // It would be difficult to manage a timer that is less than 5s given all
    // the multi-peer synchronization going on.
    min: 5
  }
});

Stages.schema.extend(TimestampSchema);
Stages.schema.extend(UserDataSchema);
Meteor.startup(function() {
  Stages.schema.extend(BelongsTo(Rounds));
  Stages.schema.extend(BelongsTo(Games));
  Stages.schema.extend(HasManyByRef(PlayerStages));
});
Stages.attachSchema(Stages.schema);
