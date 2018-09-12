import React from "react";

import { addPlayerInput } from "../../api/player-inputs/methods.js";
import { config } from "../../../experiment/client";
import {
  markPlayerExitStepDone,
  playerReady
} from "../../api/players/methods.js";
import Breadcrumb from "./Breadcrumb.jsx";
import DelayedDisplay from "./DelayedDisplay.jsx";
import ExitSteps from "./ExitSteps.jsx";
import GameLobbyContainer from "../containers/GameLobbyContainer.jsx";
import InstructionSteps from "./InstructionSteps.jsx";
import Loading from "./Loading";
import WaitingForServer from "./WaitingForServer.jsx";

const DelayedWaitingForServer = DelayedDisplay(WaitingForServer, 250);
const DelayedGameLobby = DelayedDisplay(GameLobbyContainer, 250);

const Round = config.RoundComponent;

export default class Game extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps);
  }

  render() {
    const { loading, gameLobby, treatment, ...rest } = this.props;
    const { started, timedOut, game, player, round, stage } = rest;

    if (loading) {
      return <Loading />;
    }

    if (player.exitAt) {
      const exitSteps = config.ExitSteps && config.ExitSteps(game, player);

      return (
        <ExitSteps
          steps={exitSteps}
          game={game}
          player={player}
          onSubmit={(stepName, data) => {
            const playerId = player._id;
            markPlayerExitStepDone.call({ playerId, stepName });
            if (data) {
              addPlayerInput.call({ playerId, data: JSON.stringify(data) });
            }
          }}
        />
      );
    }

    if (!game) {
      if (player.readyAt) {
        return (
          <DelayedGameLobby
            gameLobby={gameLobby}
            treatment={treatment}
            player={player}
          />
        );
      }

      return (
        <InstructionSteps
          treatment={treatment}
          player={player}
          onDone={() => {
            playerReady.call({ _id: player._id });
          }}
        />
      );
    }

    let content;
    if (timedOut || !started) {
      // If there's only one player, don't say waiting on other players,
      // just show the loading screen.
      if (treatment.condition("playerCount").value === 1) {
        content = <Loading />;
      }

      content = <DelayedWaitingForServer />;
    } else {
      content = <Round {...rest} />;
    }

    return (
      <div className="game">
        <Breadcrumb round={round} stage={stage} />
        {content}
      </div>
    );
  }
}
