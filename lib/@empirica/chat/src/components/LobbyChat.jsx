import PropTypes from "prop-types";

import React, { PureComponent } from "react";
import Chat from "./Chat";
import GameLobby from "./GameLobby";
import ErrorBoundary from "./ErrorBoundary";

export default class LobbyChat extends PureComponent {
  render() {
    return (
      <ErrorBoundary>
        <GameLobby {...this.props} />
        <Chat {...this.props} scope={this.props.game} />
      </ErrorBoundary>
    );
  }
}

LobbyChat.propTypes = {
  player: PropTypes.object.isRequired,
  game: PropTypes.object.isRequired,
  treatment: PropTypes.object.isRequired,
};
