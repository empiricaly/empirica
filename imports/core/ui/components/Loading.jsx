import React from "react";

export default class Loading extends React.Component {
  constructor(props) {
    super(props);
    this.state = { visible: false };
    // Don't immediatelly show, short loading times don't need a spinner
    this.timeout = setTimeout(() => this.setState({ visible: true }), 500);
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  render() {
    return (
      <div className={`loading ${this.state.visible ? "visible" : ""}`}>
        <div>
          Loading...
          <div className="la-ball-grid-pulse">
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
          </div>
        </div>
      </div>
    );
  }
}
