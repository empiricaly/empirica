import React from "react";

import AdminNewLobbyConfig from "./AdminNewLobbyConfig.jsx";
import Loading from "../Loading";

export default class AdminLobbyConfigs extends React.Component {
  state = { newLobbyIsOpen: false };

  render() {
    const { loading, lobbyConfigs } = this.props;

    if (loading) {
      return <Loading />;
    }

    return (
      <div className="lobbies">
        <h2>
          <span className="pt-icon-large pt-icon-time" /> Lobby Configurations
        </h2>
        {lobbyConfigs.length === 0 ? (
          <p>No lobby configurations yet, create some bellow.</p>
        ) : (
          <table className="pt-table pt-bordered">
            <thead>
              <tr>
                <th>Name</th>
                <th>Configuration</th>
              </tr>
            </thead>
            <tbody>
              {_.map(lobbyConfigs, lobby => (
                <tr key={lobby._id}>
                  <td>{lobby.name || "-"}</td>
                  <td>
                    <table className="pt-table pt-condensed inner-table">
                      <tbody>
                        <tr>
                          <td>
                            <em>type</em>
                          </td>
                          <td>{lobby.timeoutType}</td>
                        </tr>
                        <tr>
                          <td>
                            <em>timeout</em>
                          </td>
                          <td>{lobby.timeoutInSeconds}s</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

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
      </div>
    );
  }
}
