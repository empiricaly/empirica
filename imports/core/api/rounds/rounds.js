import SimpleSchema from "simpl-schema";

import {
  BelongsTo,
  HasManyByRef,
  UserDataSchema,
  TimestampSchema
} from "../default-schemas";
import { Games } from "../games/games";
import { PlayerRounds } from "../player-rounds/player-rounds";
import { Stages } from "../stages/stages";

export const Rounds = new Mongo.Collection("rounds");

Rounds.schema = new SimpleSchema({
  // Index represents the 0 based position of the current round in the ordered
  // list of a game's rounds. For display, add 1.
  index: {
    type: SimpleSchema.Integer,
    min: 0,
    max: 9999 // That's a lot of rounds...
  }
});

Rounds.schema.extend(TimestampSchema);
Rounds.schema.extend(UserDataSchema);
Meteor.startup(function() {
  Rounds.schema.extend(HasManyByRef(Stages));
  Rounds.schema.extend(BelongsTo(Games));
  Rounds.schema.extend(HasManyByRef(PlayerRounds));
});
Rounds.attachSchema(Rounds.schema);
