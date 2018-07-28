import { withTracker } from "meteor/react-meteor-data";

import { Batches } from "../../../api/batches/batches";
import { Conditions } from "../../../api/conditions/conditions.js";
import { LobbyConfigs } from "../../../api/lobby-configs/lobby-configs.js";
import { Treatments } from "../../../api/treatments/treatments";
import AdminBatches from "../../components/admin/AdminBatches";

export default withTracker(props => {
  const batchesLoading = !Meteor.subscribe("admin-batches").ready();
  const treatmentsLoading = !Meteor.subscribe("admin-treatments", {}).ready();
  const conditionsLoading = !Meteor.subscribe("admin-conditions").ready();
  const lobbyConfigsLoading = !Meteor.subscribe(
    "admin-lobby-configs",
    {}
  ).ready();

  return {
    loading:
      batchesLoading ||
      treatmentsLoading ||
      conditionsLoading ||
      lobbyConfigsLoading,
    batches: Batches.find().fetch(),
    treatments: Treatments.find().fetch(),
    conditions: Conditions.find().fetch(),
    lobbyConfigs: LobbyConfigs.find().fetch()
  };
})(AdminBatches);
