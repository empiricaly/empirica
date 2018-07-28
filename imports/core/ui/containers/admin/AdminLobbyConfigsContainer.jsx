import { withTracker } from "meteor/react-meteor-data";

import { LobbyConfigs } from "../../../api/lobby-configs/lobby-configs.js";
import AdminLobbyConfigs from "../../components/admin/AdminLobbyConfigs.jsx";

export default withTracker(props => {
  const { archived } = props;
  const loading = !Meteor.subscribe("admin-lobby-configs", {
    archived
  }).ready();

  return {
    loading,
    lobbyConfigs: LobbyConfigs.find({
      archivedAt: { $exists: Boolean(archived) }
    }).fetch(),
    ...props
  };
})(AdminLobbyConfigs);
