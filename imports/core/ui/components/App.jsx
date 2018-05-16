import PropTypes from "prop-types";
import React from "react";

export default class App extends React.Component {
  render() {
    var childrenWithProps = React.Children.map(this.props.children, child =>
      React.cloneElement(child, _.omit(this.props, "children"))
    );

    return <div className="app">{this.props.children}</div>;
  }
}

App.propTypes = {
  children: PropTypes.node
};
