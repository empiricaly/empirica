import { withTracker } from "meteor/react-meteor-data";

import { Batches } from "../../api/batches/batches.js";
import { GameLobbies } from "../../api/game-lobbies/game-lobbies.js";
import { Games } from "../../api/games/games.js";
import { createPlayer } from "../../api/players/methods.js";
import Public from "../components/Public";

export default withTracker(({ loading, player, playerId, ...rest }) => {
  if (loading) {
    return { loading: true };
  }

  const subBatches = Meteor.subscribe("runningBatches", { playerId });
  const subLobby = Meteor.subscribe("gameLobby", { playerId });
  const subGame = Meteor.subscribe("game", { playerId });
  loading = !subBatches.ready() || !subLobby.ready() || !subGame.ready();

  // Are there non-full batches left
  const batchAvailable = Batches.find({ full: false }).count() > 0;

  // Current user's assigned game and lobby
  const gameLobby = GameLobbies.findOne({
    $or: [{ playerIds: playerId }, { queuedPlayerIds: playerId }]
  });
  const game = Games.findOne({ playerIds: playerId });

  if (player && !game && !gameLobby) {
    return { loading: true };
  }

  // Check if playerId parameter is required, make sure it's present.
  const { playerIdParam, playerIdParamExclusive } = Meteor.settings.public;
  const playerIdParamRequired = playerIdParam && playerIdParamExclusive;
  const urlParams = new window.URL(document.location).searchParams;
  const playerIdParamPresent = urlParams.get(playerIdParam);
  const playerIdParamOk = playerIdParamRequired ? playerIdParamPresent : true;

  // Only open if a batch is available and the playerIdParam configuration is
  // fulfilled, or a game lobby, or a game assigned.
  const renderPublic = (batchAvailable && playerIdParamOk) || gameLobby || game;

  return {
    batchAvailable,
    renderPublic,
    loading,
    player,
    gameLobby,
    game,
    // playerStages,
    // playerRounds,
    // treatment,
    ...rest
  };
})(Public);
