import { Slider } from "@blueprintjs/core";
import React from "react";

export default class TaskResponse extends React.Component {
  handleChange = num => {
    const { player } = this.props;
    const value = Math.round(num * 100) / 100;
    player.round.set("value", value);
  };

  handleSubmit = event => {
    event.preventDefault();
    this.props.player.stage.submit();
  };

  renderSubmitted() {
    return (
      <div className="task-response">
        <div className="pt-callout pt-icon-automatic-updates">
          <h5>Waiting on other players...</h5>
          Please wait until all players are ready
        </div>
      </div>
    );
  }

  renderSlider() {
    const { player } = this.props;
    const value = player.round.get("value") || 0;
    return (
      <div className="pt-form-content">
        <Slider
          min={0}
          max={1}
          stepSize={0.01}
          labelStepSize={0.25}
          onChange={this.handleChange}
          value={value}
          showTrackFill={false}
        />
      </div>
    );
  }

  render() {
    const { stage, round, player, feedbackTime } = this.props;

    // If the player already submitted, don't show the slider or submit button
    if (player.stage.submitted) {
      return this.renderSubmitted();
    }

    return (
      <div className="task-response">
        <form onSubmit={this.handleSubmit}>
          <div className="pt-form-group">{this.renderSlider()}</div>

          <div className="pt-form-group">
            <button type="submit" className="pt-button pt-icon-tick pt-large">
              Submit
            </button>
          </div>
        </form>
      </div>
    );
  }
}
