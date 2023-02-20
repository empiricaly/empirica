import React, { PureComponent } from "react";
import { NonIdealState } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import PropTypes from "prop-types";

export default class GameLobby extends PureComponent {
  renderPlayersReady = () => {
    return (
      <div className="game-lobby">
        <NonIdealState
          icon={IconNames.PLAY}
          title="Game loading..."
          description="Your game will be starting shortly, get ready!"
        />
      </div>
    );
  };

  render() {
    const { game, treatment } = this.props;

    const total = treatment.factor("playerCount").value;
    const existing = game.playerIds.length;

    if (existing >= total) {
      return this.renderPlayersReady();
    }

    return (
      <div className="game-lobby">
        <NonIdealState
          icon={IconNames.TIME}
          title="Lobby"
          description={
            <>
              <p>Please wait for the game to be ready...</p>
              <p>
                {existing} / {total} players ready.
              </p>
            </>
          }
        />
      </div>
    );
  }
}

GameLobby.propTypes = {
  game: PropTypes.object.isRequired,
  treatment: PropTypes.object.isRequired,
};
