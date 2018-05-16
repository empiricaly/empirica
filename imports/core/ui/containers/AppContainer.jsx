import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";

import App from "../components/App";

export default withTracker(() => {
  return {
    user: Meteor.user(),
    loggingIn: Meteor.loggingIn(),
    loading: Meteor.loggingIn(),
    connected: Meteor.status().connected
  };
})(App);
