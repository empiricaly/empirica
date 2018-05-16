import { Route } from "react-router-dom";
import { withTracker } from "meteor/react-meteor-data";
import React from "react";

import { Players } from "../../api/players/players.js";

class IdentifiedRouteInner extends React.Component {
  render() {
    const { path, component: Component, ...rest } = this.props;
    return <Route path={path} render={props => <Component {...rest} />} />;
  }
}
const defaultPlayerIdKey = "d4900a09cf1f41a494d4fc32a626dfef";

const urlParams = new URLSearchParams(window.location.search);
let playerIdKeyOverride = urlParams.get("playerIdKey");
if (playerIdKeyOverride) {
  playerIdKeyOverride += "-" + defaultPlayerIdKey;
}

const playerIdKey = playerIdKeyOverride || defaultPlayerIdKey;
const playerIdDep = new Tracker.Dependency();

export const getPlayerId = () => {
  playerIdDep.depend();
  return localStorage.getItem(playerIdKey);
};

export const setPlayerId = playerId => {
  if (!playerId) {
    // Avoid storing falsey value
    return;
  }
  const existing = localStorage.getItem(playerIdKey);
  if (existing === playerId) {
    return;
  }
  localStorage.setItem(playerIdKey, playerId);
  playerIdDep.changed();
};

export const removePlayerId = () => {
  localStorage.removeItem(playerIdKey);
  playerIdDep.changed();
};

export default withTracker(rest => {
  const playerId = getPlayerId();
  const loading = !Meteor.subscribe("playerInfo", { playerId }).ready();
  const player = Players.findOne();

  // If we finished loading and the player was not found, clear saved playerId
  if (!loading && playerId && !player) {
    console.error(`clearing player: (${playerId})`);
    removePlayerId();
  }

  return {
    ...rest,
    loading,
    playerId,
    player,
    connected: Meteor.status().connected
  };
})(IdentifiedRouteInner);
