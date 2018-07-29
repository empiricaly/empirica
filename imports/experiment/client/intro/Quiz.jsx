import React from "react";

import { AlertToaster } from "../../../core/ui/components/Toasters.jsx";
import Centered from "../../../core/ui/components/Centered.jsx";

export default class Quiz extends React.Component {
  state = { value1: "", value2: "" };

  handleChange = event => {
    const el = event.currentTarget;
    this.setState({ [el.name]: el.value.trim().toLowerCase() });
  };

  handleSubmit = event => {
    event.preventDefault();

    if (this.state.value1 !== "4" || this.state.value2 !== "white") {
      AlertToaster.show({ message: "Nope" });
    } else {
      this.props.onNext();
    }
  };

  render() {
    const { hasPrev, hasNext, onNext, onPrev } = this.props;
    const { value1, value2 } = this.state;
    return (
      <Centered>
        <div className="quiz">
          <h1> Quiz </h1>
          <form onSubmit={this.handleSubmit}>
            <div className="pt-form-group">
              <label className="pt-label" htmlFor="example-form-group-input-a">
                What is 2+2?
              </label>
              <div className="pt-form-content">
                <input
                  id="example-form-group-input-a"
                  className="pt-input"
                  placeholder="e.g. 3"
                  type="text"
                  dir="auto"
                  name="value1"
                  value={value1}
                  onChange={this.handleChange}
                  required
                />
              </div>
            </div>
            <div className="pt-form-group">
              <label className="pt-label" htmlFor="example-form-group-input-a">
                What color was Napoleon's white horse?
              </label>
              <div className="pt-form-content">
                <input
                  id="example-form-group-input-a"
                  className="pt-input"
                  placeholder="e.g. brown"
                  type="text"
                  dir="auto"
                  name="value2"
                  value={value2}
                  onChange={this.handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="button"
              className="pt-button pt-intent-nope pt-icon-double-chevron-left"
              onClick={onPrev}
              disabled={!hasPrev}
            >
              Back to instructions
            </button>
            <button type="submit" className="pt-button pt-intent-primary">
              Submit
              <span className="pt-icon-standard pt-icon-key-enter pt-align-right" />
            </button>
          </form>
        </div>
      </Centered>
    );
  }
}
