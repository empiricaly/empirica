import { withTracker } from "meteor/react-meteor-data";

import { Conditions } from "../../../api/conditions/conditions.js";
import { Treatments } from "../../../api/treatments/treatments";
import AdminConditions from "../../components/admin/AdminConditions.jsx";

export const ConditionTypes = new Mongo.Collection("condition_types");

export default withTracker(props => {
  const treatmentsLoading = !Meteor.subscribe("admin-treatments", {}).ready();
  const conditionsLoading = !Meteor.subscribe("admin-conditions").ready();
  const typesLoading = !Meteor.subscribe("admin-condition-types").ready();

  return {
    loading: treatmentsLoading || conditionsLoading || typesLoading,
    treatments: Treatments.find().fetch(),
    conditions: Conditions.find({}, { sort: { value: 1 } }).fetch(),
    conditionTypes: ConditionTypes.find().fetch()
  };
})(AdminConditions);
