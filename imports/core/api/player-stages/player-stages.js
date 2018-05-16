import SimpleSchema from "simpl-schema";

import { Batches } from "../batches/batches";
import { Games } from "../games/games";
import { Players } from "../players/players";
import { Rounds } from "../rounds/rounds";
import { Stages } from "../stages/stages";
import { TimestampSchema, UserDataSchema, BelongsTo } from "../default-schemas";

export const PlayerStages = new Mongo.Collection("player_stages");

PlayerStages.schema = new SimpleSchema({
  submittedAt: {
    type: Date,
    denyInsert: true,
    optional: true
  }
});

PlayerStages.schema.extend(TimestampSchema);
PlayerStages.schema.extend(UserDataSchema);
Meteor.startup(function() {
  PlayerStages.schema.extend(BelongsTo(Players));
  PlayerStages.schema.extend(BelongsTo(Stages));
  PlayerStages.schema.extend(BelongsTo(Rounds));
  PlayerStages.schema.extend(BelongsTo(Games));
  PlayerStages.schema.extend(BelongsTo(Batches));
});
PlayerStages.attachSchema(PlayerStages.schema);
