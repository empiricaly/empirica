import { withTracker } from "meteor/react-meteor-data";

import { LobbyConfigs } from "../../../api/lobby-configs/lobby-configs.js";
import AdminLobbyConfigs from "../../components/admin/AdminLobbyConfigs.jsx";

export default withTracker(props => {
  const loading = !Meteor.subscribe("admin-lobby-configs").ready();

  return {
    loading,
    lobbyConfigs: LobbyConfigs.find().fetch()
  };
})(AdminLobbyConfigs);
