import React from "react";

// Centered is a simple helper for centered pages
export default class Centered extends React.Component {
  render() {
    return <div className="centered">{this.props.children}</div>;
  }
}
