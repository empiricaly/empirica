import React from "react";

import Centered from "../../../core/ui/components/Centered.jsx";

export default class Thanks extends React.Component {
  render() {
    return (
      <div className="game finished">
        <div className="pt-non-ideal-state">
          <div className="pt-non-ideal-state-visual pt-non-ideal-state-icon">
            <span className="pt-icon pt-icon-thumbs-up" />
          </div>
          <h4 className="pt-non-ideal-state-title">Finished!</h4>
          <div className="pt-non-ideal-state-description">
            Thank you for participating!
          </div>
        </div>
      </div>
    );
  }
}
