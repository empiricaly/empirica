import React from "react";

import Centered from "../../../core/ui/components/Centered.jsx";

export default class Consent extends React.Component {
  render() {
    return (
      <Centered>
        <div className="consent">
          <h1> Consent Form </h1>
          <p>
            This experiment is part of a MIT scientific project. Your decision
            to participate in this experiment is entirely voluntary. There are
            no known or anticipated risks to participating in this experiment.
            There is no way for us to identify you. The only information we will
            have, in addition to your responses, is the timestamps of your
            interactions with our site. The results of our research may be
            presented at scientific meetings or published in scientific
            journals. Clicking on the "AGREE" button indicates that you are at
            least 18 years of age, and agree to participate voluntary.
          </p>
          <button
            type="button"
            className="pt-button pt-intent-success pt-icon-tick"
            onClick={this.props.onConsent}
          >
            AGREE
          </button>
        </div>
      </Centered>
    );
  }
}
