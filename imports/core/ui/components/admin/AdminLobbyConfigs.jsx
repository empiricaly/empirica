import React from "react";

import { Link } from "react-router-dom";
import { EditableText } from "@blueprintjs/core";
import { AlertToaster } from "../Toasters.jsx";
import AdminNewLobbyConfig from "./AdminNewLobbyConfig.jsx";
import Loading from "../Loading";
import { updateLobbyConfig } from "../../../api/lobby-configs/methods";

export default class AdminLobbyConfigs extends React.Component {
  state = { newLobbyIsOpen: false };

  render() {
    const { loading, lobbyConfigs, archived } = this.props;

    if (loading) {
      return <Loading />;
    }

    return (
      <div className="lobbies">
        <h2>
          <span className="pt-icon-large pt-icon-time" />
          {archived ? "Archived Lobby Configurations" : "Lobby Configurations"}
        </h2>
        {lobbyConfigs.length === 0 ? (
          <p>
            {archived
              ? "No archived lobby configurations."
              : "No lobby configurations yet, create some bellow."}
          </p>
        ) : (
          <table className="pt-table pt-html-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>
                  <em>Type</em>
                </th>
                <th>
                  <em>Timeout</em>
                </th>
                <th>
                  <em>Timeout Strategy</em>
                </th>
                <th>
                  <em>Extend Count</em>
                </th>
              </tr>
            </thead>
            <tbody>
              {_.map(lobbyConfigs, lobbyConfig => (
                <AdminLobbyConfig
                  key={lobbyConfig._id}
                  lobbyConfig={lobbyConfig}
                  archived={archived}
                />
              ))}
            </tbody>
          </table>
        )}

        {archived ? (
          <p>
            <br />
            <Link to="/admin/lobby-configurations">
              Back to active Lobby Configurations
            </Link>
          </p>
        ) : (
          <>
            <br />

            <button
              type="button"
              className="pt-button"
              onClick={() => this.setState({ newLobbyIsOpen: true })}
            >
              New Lobby Configuration
            </button>

            <AdminNewLobbyConfig
              onClose={() => this.setState({ newLobbyIsOpen: false })}
              isOpen={this.state.newLobbyIsOpen}
            />

            <p>
              <br />
              <Link to="/admin/lobby-configurations/archived">
                View Archived Lobby Configurations
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }
}

class AdminLobbyConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.lobbyConfig.name || ""
    };
  }

  componentWillUpdate(props) {
    if (props.lobbyConfig.name !== this.props.lobbyConfig.name) {
      this.setState({ name: props.lobbyConfig.name || "" });
    }
  }

  handleNameChange = name => {
    this.setState({ name: name || "" });
  };

  handleNameConfirm = () => {
    const { _id, name: prevName } = this.props.lobbyConfig;
    const { name: nameRaw } = this.state;
    const name = nameRaw.trim();
    if (name === prevName) {
      this.handleNameChange(prevName);
      return;
    }

    updateLobbyConfig.call({ _id, name }, err => {
      if (err) {
        AlertToaster.show({ message: String(err) });
        this.handleNameChange(prevName);
        return;
      }
    });
  };

  handleArchive = () => {
    const {
      archived,
      lobbyConfig: { _id }
    } = this.props;
    updateLobbyConfig.call({ _id, archived: !archived });
  };

  render() {
    const { lobbyConfig, archived } = this.props;
    const { name } = this.state;

    const archiveIntent = archived ? "pt-intent-success" : "pt-intent-danger";
    return (
      <tr>
        <td>
          <EditableText
            onChange={this.handleNameChange}
            onConfirm={this.handleNameConfirm}
            value={name}
          />
        </td>
        <td>{lobbyConfig.timeoutType}</td>
        <td>{lobbyConfig.timeoutInSeconds}s</td>
        <td>
          {lobbyConfig.timeoutType === "lobby"
            ? lobbyConfig.timeoutStrategy
            : "-"}
        </td>
        <td>
          {lobbyConfig.timeoutType === "individual"
            ? lobbyConfig.extendCount
            : "-"}
        </td>
        <td>
          <button
            type="button"
            className={`pt-button ${archiveIntent} pt-icon-box pt-minimal pt-small`}
            onClick={this.handleArchive}
          >
            {archived ? "Unarchive" : "Archive"}
          </button>
        </td>
      </tr>
    );
  }
}
