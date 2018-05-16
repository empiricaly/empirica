import { Route } from "react-router-dom";
import React from "react";

import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";

class AuthorizedRouteInner extends React.Component {
  render() {
    const { path, component: Component, ...rest } = this.props;
    return <Route path={path} render={props => <Component {...rest} />} />;
  }
}

export default withTracker(rest => {
  return {
    ...rest,
    user: Meteor.user(),
    loggingIn: Meteor.loggingIn(),
    loading: Meteor.loggingIn(),
    connected: Meteor.status().connected
  };
})(AuthorizedRouteInner);
