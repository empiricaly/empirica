import React from "react";

const errExitStepMissingName =
  "At least one 'Exit Step' is missing a name or a displayName. All 'Exist Steps' Components must have a name or displayName or all hell will break loose. See https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging to add a displayName.";
const errExitStepDups = dups =>
  `All 'Exit Steps' must be unique (have a unique name/displayName). Duplicated: ${dups}.`;

export default class ExitSteps extends React.Component {
  constructor(props) {
    super(props);
    const { game, player, steps: unfilteredSteps } = props;

    // Checks steps have a name
    stepNames = unfilteredSteps.map(s =>
      (s.displayName || s.name || "").trim()
    );
    for (let index = 0; index < stepNames.length; index++) {
      const sname = stepNames[index];
      if (_.isEmpty(sname)) {
        alert(errExitStepMissingName);
        console.error(errExitStepMissingName);
        this.state = { failed: errExitStepMissingName };
        return;
      }
    }

    // Checks steps are unique
    if (stepNames.length !== _.uniq(stepNames).length) {
      const counts = {};
      stepNames.forEach(n => (counts[n] = (counts[n] || 0) + 1));
      const dups = _.compact(_.map(counts, (v, k) => (v > 1 ? k : null))).join(
        ", "
      );
      const err = errExitStepDups(dups);
      alert(err);
      this.state = { failed: err };
      return null;
    }

    const done = player.exitStepsDone || [];
    const steps = unfilteredSteps.filter(
      s => !done.includes(s.displayName || s.name)
    );

    this.state = { current: 0, steps };
  }

  onSubmit = data => {
    let { onSubmit } = this.props;
    let { steps, current } = this.state;
    const Step = steps[current];
    onSubmit(Step.name || Step.displayName, data);
    current = current + 1;
    this.setState({ current });
  };

  render() {
    const { failed, steps, current } = this.state;

    if (failed) {
      return failed;
    }

    if (_.isEmpty(steps)) {
      return this.renderDefault();
    }

    const Step = steps[current];
    const hasNext = steps.length - 1 > current;

    return <Step {...this.props} hasNext={hasNext} onSubmit={this.onSubmit} />;
  }

  renderDefault() {
    return (
      <div className="game finished">
        <div className="pt-non-ideal-state">
          <div className="pt-non-ideal-state-visual pt-non-ideal-state-icon">
            <span className="pt-icon pt-icon-tick" />
          </div>
          <h4 className="pt-non-ideal-state-title">Finished!</h4>
          <div className="pt-non-ideal-state-description">
            Thank you for participating.
            <DevNote block>
              There should be some outro steps here, including payment.
            </DevNote>
          </div>
        </div>
      </div>
    );
  }
}
