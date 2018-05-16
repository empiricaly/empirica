import SimpleSchema from "simpl-schema";

import { Batches } from "../batches/batches";
import { Games } from "../games/games";
import { Players } from "../players/players";
import { Rounds } from "../rounds/rounds";
import { TimestampSchema, UserDataSchema, BelongsTo } from "../default-schemas";

export const PlayerRounds = new Mongo.Collection("player_rounds");

PlayerRounds.schema = new SimpleSchema({});

PlayerRounds.schema.extend(TimestampSchema);
PlayerRounds.schema.extend(UserDataSchema);
Meteor.startup(function() {
  PlayerRounds.schema.extend(BelongsTo(Players));
  PlayerRounds.schema.extend(BelongsTo(Rounds));
  PlayerRounds.schema.extend(BelongsTo(Games));
  PlayerRounds.schema.extend(BelongsTo(Batches));
});
PlayerRounds.attachSchema(PlayerRounds.schema);
