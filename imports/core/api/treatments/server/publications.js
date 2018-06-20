import { Conditions } from "../../conditions/conditions.js";
import { Treatments } from "../treatments";

Meteor.publish("admin-treatments", function() {
  if (!this.userId) {
    return null;
  }

  return [Treatments.find()];
});

Meteor.publish("treatment", function(treatmentId) {
  if (!treatmentId) {
    return [];
  }

  const treatment = Treatments.findOne(treatmentId);

  if (!treatment) {
    return [];
  }

  return [
    Treatments.find(treatmentId),
    Conditions.find({
      _id: {
        $in: treatment.conditionIds
      }
    })
  ];
});
