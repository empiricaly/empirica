import { TimeSync } from "meteor/mizzao:timesync";
import { withTracker } from "meteor/react-meteor-data";
import moment from "moment";

import { LobbyConfigs } from "../../api/lobby-configs/lobby-configs.js";
import GameLobby from "../components/GameLobby.jsx";

// Handles all the timing stuff
export default withTracker(({ gameLobby, player, ...rest }) => {
  const lobbyConfig = LobbyConfigs.findOne(gameLobby.lobbyConfigId);

  // TimeSync.serverTime() is a reactive source that will trigger this
  // withTracker function every 1s.
  const now = moment(TimeSync.serverTime(null, 100));

  const startObj = lobbyConfig.timeoutType === "lobby" ? gameLobby : player;
  const startTimeAt = moment(startObj.timeoutStartedAt);
  const endTimeAt = startTimeAt.add(lobbyConfig.timeoutInSeconds, "seconds");
  const timedOut = now.isSameOrAfter(endTimeAt);

  return {
    lobbyConfig,
    gameLobby,
    player,
    timedOut,
    // endTimeAt,
    ...rest
  };
})(GameLobby);
