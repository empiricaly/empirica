import { withTracker } from "meteor/react-meteor-data";

import { ConditionTypes } from "./AdminConditionsContainer.jsx";
import { Conditions } from "../../../api/conditions/conditions.js";
import { Treatments } from "../../../api/treatments/treatments";
import AdminTreatments from "../../components/admin/AdminTreatments";

export default withTracker(props => {
  const { archived } = props;
  const treatmentsLoading = !Meteor.subscribe("admin-treatments", {
    archived
  }).ready();
  const conditionsLoading = !Meteor.subscribe("admin-conditions").ready();
  const typesLoading = !Meteor.subscribe("admin-condition-types").ready();

  return {
    loading: treatmentsLoading || conditionsLoading,
    typesLoading,
    treatments: Treatments.find().fetch({
      archivedAt: { $exists: Boolean(archived) }
    }),
    conditions: Conditions.find({}, { sort: { value: 1 } }).fetch(),
    conditionTypes: ConditionTypes.find().fetch(),
    ...props
  };
})(AdminTreatments);
