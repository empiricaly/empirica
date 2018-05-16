import { Treatments } from "../treatments";
import { config } from "../../../../experiment/server";

Meteor.publish("admin-treatments", function() {
  if (!this.userId) {
    return null;
  }

  return [Treatments.find()];
});
