import React from "react";

export default class AdminGames extends React.Component {
  render() {
    return (
      <div className="games">
        <h2>
          <span className="pt-icon-large pt-icon-flows" /> Games
        </h2>

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
