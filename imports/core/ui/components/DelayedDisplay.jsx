import React from "react";

const DelayedDisplay = (Component, delay = 100) =>
  class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { visible: false };
      // Don't immediatelly show, short loading times don't need a spinner
      this.timeout = setTimeout(() => this.setState({ visible: true }), delay);
    }

    componentWillUnmount() {
      clearTimeout(this.timeout);
    }

    render() {
      const { visible } = this.state;

      return (
        <div className={`delayed ${visible ? "visible" : ""}`}>
          <Component {...this.props} />
        </div>
      );
    }
  };

export default DelayedDisplay;
