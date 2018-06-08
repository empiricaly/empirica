import React from "react";

import Centered from "../../../core/ui/components/Centered.jsx";

const Radio = ({ selected, name, value, label, onChange }) => (
  <label className="pt-control pt-radio pt-inline">
    <input
      type="radio"
      name={name}
      value={value}
      checked={selected === value}
      onChange={onChange}
    />
    <span className="pt-control-indicator" />
    {label}
  </label>
);

export default class ExitSurvey extends React.Component {
  static stepName = "ExitSurvey";
  state = { age: "", gender: "", strength: "", fair: "", feedback: "" };

  handleChange = event => {
    const el = event.currentTarget;
    this.setState({ [el.name]: el.value });
  };

  handleSubmit = event => {
    event.preventDefault();
    this.props.onSubmit(this.state);
  };

  render() {
    const { age, gender, strength, fair, feedback, education } = this.state;

    const { player } = this.props;
    return (
      <Centered>
        <div className="exit-survey">
          <h1> Exit Survey </h1>
          <p>
            Please submit the following code to receive your bonus:{" "}
            <strong>{player._id}</strong>.
          </p>
          <p>
            You final <strong>bonus</strong> is in addition of the{" "}
            <strong>1 base reward</strong> for completing the HIT.
          </p>
          <br />
          <p>
            Please answer the following short survey. You do not have to provide
            any information you feel uncomfortable with.
          </p>
          <form onSubmit={this.handleSubmit}>
            <div className="form-line">
              <div className="pt-form-group">
                <label className="pt-label" htmlFor="age">
                  Age
                </label>
                <div className="pt-form-content">
                  <input
                    id="age"
                    className="pt-input"
                    type="number"
                    min="0"
                    max="150"
                    step="1"
                    dir="auto"
                    name="age"
                    value={age}
                    onChange={this.handleChange}
                    // required
                  />
                </div>
              </div>
              <div className="pt-form-group">
                <label className="pt-label" htmlFor="gender">
                  Gender
                </label>
                <div className="pt-form-content">
                  <input
                    id="gender"
                    className="pt-input"
                    type="text"
                    dir="auto"
                    name="gender"
                    value={gender}
                    onChange={this.handleChange}
                    // required
                  />
                </div>
              </div>
            </div>

            <div className="pt-form-group">
              <label className="pt-label">
                Highest Education Qualification
              </label>
              <div className="pt-form-content">
                <Radio
                  selected={education}
                  name="education"
                  value="high-school"
                  label="High School"
                  onChange={this.handleChange}
                />
                <Radio
                  selected={education}
                  name="education"
                  value="bachelor"
                  label="US Bachelor's Degree"
                  onChange={this.handleChange}
                />
                <Radio
                  selected={education}
                  name="education"
                  value="master"
                  label="Master's or higher"
                  onChange={this.handleChange}
                />
                <Radio
                  selected={education}
                  name="education"
                  value="other"
                  label="Other"
                  onChange={this.handleChange}
                />
              </div>
            </div>

            <div className="form-line thirds">
              <div className="pt-form-group">
                <label className="pt-label" htmlFor="age">
                  How would you describe your strength in the game?
                </label>
                <div className="pt-form-content">
                  <textarea
                    className="pt-input pt-fill"
                    dir="auto"
                    name="strength"
                    value={strength}
                    onChange={this.handleChange}
                  />
                </div>
              </div>
              <div className="pt-form-group">
                <label className="pt-label" htmlFor="age">
                  Do you feel the pay was fair?
                </label>
                <div className="pt-form-content">
                  <textarea
                    className="pt-input pt-fill"
                    dir="auto"
                    name="fair"
                    value={fair}
                    onChange={this.handleChange}
                  />
                </div>
              </div>
              <div className="pt-form-group">
                <label className="pt-label" htmlFor="age">
                  Feedback, including problems you encountered.
                </label>
                <div className="pt-form-content">
                  <textarea
                    className="pt-input pt-fill"
                    dir="auto"
                    name="feedback"
                    value={feedback}
                    onChange={this.handleChange}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="pt-button pt-intent-primary">
              Submit
              <span className="pt-icon-standard pt-icon-key-enter pt-align-right" />
            </button>
          </form>{" "}
        </div>
      </Centered>
    );
  }
}
