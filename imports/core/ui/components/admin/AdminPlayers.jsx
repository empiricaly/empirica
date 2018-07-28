import React from "react";
import { AlertToaster, SuccessToaster } from "../Toasters";
import { archiveGameFullPlayers } from "../../../api/players/methods";

export default class AdminPlayers extends React.Component {
  handleCleaPlayersGameFull = event => {
    event.preventDefault();
    archiveGameFullPlayers.call((err, playersAffected) => {
      if (err) {
        AlertToaster.show({ message: `Failed to archive players: ${err}` });
      } else {
        SuccessToaster.show({ message: `${playersAffected} players affected` });
      }
    });
  };

  render() {
    return (
      <div className="players">
        <h2>
          <span className="pt-icon-large pt-icon-person" /> Players
        </h2>

        <button
          type="button"
          className="pt-button"
          onClick={this.handleCleaPlayersGameFull}
        >
          Archive Player Records with "Game Full"
        </button>

        <div className="pt-non-ideal-state">
          <div className="pt-non-ideal-state-visual pt-non-ideal-state-icon">
            <span className="pt-icon pt-icon-build" />
          </div>
          <h4 className="pt-non-ideal-state-title">Under construction</h4>
          {/* <div className="pt-non-ideal-state-description">
            Under construction
            </div> */}
        </div>

        {/* <p>
          <span className="pt-icon-large pt-icon-build" />
          Under construction
        </p> */}
      </div>
    );
  }
}
