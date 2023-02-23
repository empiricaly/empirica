/* eslint-disable react/prefer-stateless-function */
import React, { Component } from "react";

export default function filteredMessages(WrappedComponent) {
  return class extends Component {
    render() {
      const { scope, customKey, filter } = this.props;
      let messages = scope.get(customKey) || [];
      if (filter) {
        messages = filter(messages);
      }

      return <WrappedComponent messages={[...messages]} {...this.props} />;
    }
  };
}
