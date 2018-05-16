import React from "react";
import { Slider } from "@blueprintjs/core";

export default class SocialExposure extends React.Component {
  renderSocialInteraction(otherPlayer) {
    const value = otherPlayer.round.get("value") || 0;
    return (
      <div className="alter pt-card pt-elevation-2" key={otherPlayer._id}>
        <img src={otherPlayer.get("avatar")} className="profile-avatar" />
        <div className="range">
          <Slider
            min={0}
            max={1}
            stepSize={0.01}
            labelRenderer={() => ""}
            value={value}
            showTrackFill={false}
            disabled
          />
        </div>
      </div>
    );
  }

  render() {
    const { game, player } = this.props;

    const otherPlayers = _.reject(game.players, p => p._id === player._id);

    if (otherPlayers.length === 0) {
      return null;
    }

    return (
      <div className="social-exposure">
        <p>
          <strong>There are {otherPlayers.length} other players:</strong>
        </p>
        {!_.isEmpty(otherPlayers)
          ? otherPlayers.map(p => this.renderSocialInteraction(p))
          : ""}
      </div>
    );
  }
}
