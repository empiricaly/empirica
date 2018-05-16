import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";

import Admin from "../components/Admin";

export default withTracker(rest => {
  return {
    ...rest,
    user: Meteor.user(),
    loggingIn: Meteor.loggingIn(),
    loading: Meteor.loggingIn(),
    connected: Meteor.status().connected
  };
})(Admin);
