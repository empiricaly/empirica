// PlayerInputs contains small pieces of information associated with a player
// This can be input forms from intro/outro or intermediate input values while
// playing the game (e.g. all values while moving a range input, mouse,
// movements...)

import SimpleSchema from "simpl-schema";

import { Players } from "../players/players";
import { TimestampSchema, UserDataSchema, BelongsTo } from "../default-schemas";

export const PlayerInputs = new Mongo.Collection("player_inputs");

PlayerInputs.schema = new SimpleSchema({});

PlayerInputs.schema.extend(TimestampSchema);
PlayerInputs.schema.extend(UserDataSchema);
Meteor.startup(function() {
  PlayerInputs.schema.extend(BelongsTo(Players));
});
PlayerInputs.attachSchema(PlayerInputs.schema);
