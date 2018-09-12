import React from "react";

import { AlertToaster, SuccessToaster } from "../Toasters";
import { retireGameFullPlayers } from "../../../api/players/methods";
import { exitStatuses } from "../../../api/players/players.js";

export default class AdminPlayers extends React.Component {
  state = { retiredReason: exitStatuses[0] };

  handleChange = event => {
    const retiredReason = event.currentTarget.value;
    this.setState({
      retiredReason
    });
  };

  handleRetirePlayers = event => {
    event.preventDefault();
    const { retiredReason } = this.state;
    retireGameFullPlayers.call({ retiredReason }, (err, playersAffected) => {
      if (err) {
        AlertToaster.show({ message: `Failed to retire players: ${err}` });
      } else {
        SuccessToaster.show({ message: `${playersAffected} players affected` });
      }
    });
  };

  render() {
    const { retiredReason } = this.state;
    return (
      <div className="players">
        <h2>
          <span className="pt-icon-large pt-icon-person" /> Players
        </h2>

        <div className="pt-form-group">
          <div className="pt-form-content">
            <div className="pt-select">
              <select
                className="pt-input"
                name="retire"
                id="retire"
                onChange={this.handleChange}
                value={retiredReason}
              >
                {_.map(exitStatuses, name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <br />
            <br />
            <button
              type="button"
              className="pt-button pt-intent-primary"
              onClick={this.handleRetirePlayers}
            >
              Retire Players with exitStatus <strong>{retiredReason}</strong>
            </button>
          </div>
        </div>

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
