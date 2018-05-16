import React from "react";

import Centered from "../../../core/ui/components/Centered.jsx";

export default class InstructionStepTwo extends React.Component {
  render() {
    const { hasPrev, hasNext, onNext, onPrev } = this.props;
    return (
      <Centered>
        <div className="instructions">
          <h1> Instructions 2 </h1>
          <p>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Optio,
            animi? Quae autem asperiores officiis voluptatum fuga recusandae
            minima! Animi pariatur ex sapiente laborum. Ipsa quo quia ab,
            veritatis et labore.
          </p>
          <button
            type="button"
            className="pt-button pt-intent-nope pt-icon-double-chevron-left"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            Previous
          </button>
          <button
            type="button"
            className="pt-button pt-intent-primary"
            onClick={onNext}
            disabled={!hasNext}
          >
            Next
            <span className="pt-icon-standard pt-icon-double-chevron-right pt-align-right" />
          </button>
        </div>
      </Centered>
    );
  }
}
