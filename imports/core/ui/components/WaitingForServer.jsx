import React from "react";

export default class WaitingForServer extends React.Component {
  render() {
    return (
      <div className="game waiting">
        <div className="pt-non-ideal-state">
          <div className="pt-non-ideal-state-visual pt-non-ideal-state-icon">
            <span className="pt-icon pt-icon-automatic-updates" />
          </div>
          <h4 className="pt-non-ideal-state-title">
            {/*a more neutral message in case it was a single player*/}
            Waiting for server response...
          </h4>
          <div className="pt-non-ideal-state-description">
            Please wait until all players are ready.
          </div>
        </div>
      </div>
    );
  }
}
