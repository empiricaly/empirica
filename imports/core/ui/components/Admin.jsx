import { Helmet } from "react-helmet";
import { NavLink, Route, Switch } from "react-router-dom";
import { Tooltip, Position, Intent } from "@blueprintjs/core";
import PropTypes from "prop-types";
import React from "react";

import AdminBatchesContainer from "../containers/admin/AdminBatchesContainer";
import AdminConditionsContainer from "../containers/admin/AdminConditionsContainer.jsx";
import AdminGames from "./admin/AdminGames.jsx";
import AdminLobbyConfigsContainer from "../containers/admin/AdminLobbyConfigsContainer.jsx";
import AdminPlayers from "./admin/AdminPlayers.jsx";
import AdminTreatmentsContainer from "../containers/admin/AdminTreatmentsContainer";
import { withStaticProps } from "./Helpers";

export default class Admin extends React.Component {
  componentDidMount() {
    this.redirectLoggedOut(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.redirectLoggedOut(nextProps);
  }

  resetDatabaseIsActived() {
    return Meteor.isDevelopment || Meteor.settings.public.debug_resetDatabase;
  }

  handleLogout = () => {
    Meteor.logout();
  };

  handleClear = () => {
    if (!this.resetDatabaseIsActived()) {
      return;
    }
    Meteor.call("adminResetDB", true);
  };

  handleReset = () => {
    const confirmed = confirm(
      "You are about to delete all data in the DB, are you sure you want to do that?"
    );
    if (!confirmed) {
      return;
    }
    const confirmed2 = confirm("Are you really sure?");
    if (!confirmed2) {
      return;
    }
    if (!this.resetDatabaseIsActived()) {
      return;
    }
    Meteor.call("adminResetDB");
  };

  redirectLoggedOut(props) {
    const { user, loggingIn } = props;
    const { router } = this.context;

    if (!loggingIn && !user) {
      router.history.push(`/login`);
    }
  }

  render() {
    const { user, loggingIn, match } = this.props;

    if (loggingIn || !user) {
      return null;
    }

    return (
      <div className="admin">
        <Helmet>
          <title>Empirica Admin</title>
        </Helmet>
        <nav className="pt-navbar header">
          <div className="pt-navbar-group pt-align-left">
            <div className="pt-navbar-heading">Empirica Admin</div>
            <NavLink
              exact
              to="/admin"
              activeClassName="pt-active"
              className="pt-button pt-minimal"
            >
              Batches
            </NavLink>
            <NavLink
              exact
              to="/admin/games"
              activeClassName="pt-active"
              className="pt-button pt-minimal"
            >
              Games
            </NavLink>
            <NavLink
              exact
              to="/admin/players"
              activeClassName="pt-active"
              className="pt-button pt-minimal"
            >
              Players
            </NavLink>
            <NavLink
              exact
              to="/admin/lobby-configurations"
              activeClassName="pt-active"
              className="pt-button pt-minimal"
            >
              Lobby Configurations
            </NavLink>
            <NavLink
              exact
              to="/admin/treatments"
              activeClassName="pt-active"
              className="pt-button pt-minimal"
            >
              Treatments
            </NavLink>
            <NavLink
              exact
              to="/admin/conditions"
              activeClassName="pt-active"
              className="pt-button pt-minimal"
            >
              Conditions
            </NavLink>
          </div>

          <div className="pt-navbar-group pt-align-right">
            <button
              className="pt-button pt-minimal pt-icon-log-out"
              onClick={this.handleLogout}
            >
              Logout
            </button>
          </div>

          {this.resetDatabaseIsActived() ? (
            <div className="pt-navbar-group pt-align-right">
              <Tooltip
                content="This will remove batches/games/players and keep treatments/conditions"
                position={Position.BOTTOM}
              >
                <button
                  className="pt-button pt-minimal pt-icon-eraser"
                  onClick={this.handleClear}
                >
                  Clear games
                </button>
              </Tooltip>
              <Tooltip
                content="This clears the entire database!"
                position={Position.BOTTOM}
                intent={Intent.DANGER}
              >
                <button
                  className="pt-button pt-minimal pt-icon-trash"
                  onClick={this.handleReset}
                >
                  Reset entire app
                </button>
              </Tooltip>
              <span className="pt-navbar-divider" />
            </div>
          ) : (
            ""
          )}
        </nav>

        <main>
          <Switch>
            <Route path="/admin" exact component={AdminBatchesContainer} />
            <Route path="/admin/games" component={AdminGames} />
            <Route path="/admin/players" component={AdminPlayers} />
            <Route
              path="/admin/treatments/archived"
              component={withStaticProps(AdminTreatmentsContainer, {
                archived: true
              })}
            />
            <Route
              path="/admin/treatments"
              component={withStaticProps(AdminTreatmentsContainer, {
                archived: false
              })}
            />
            <Route
              path="/admin/lobby-configurations/archived"
              component={withStaticProps(AdminLobbyConfigsContainer, {
                archived: true
              })}
            />
            <Route
              path="/admin/lobby-configurations"
              component={withStaticProps(AdminLobbyConfigsContainer, {
                archived: false
              })}
            />
            <Route
              path="/admin/conditions"
              component={AdminConditionsContainer}
            />
          </Switch>
        </main>
      </div>
    );
  }
}

Admin.propTypes = {
  user: PropTypes.object, // Current meteor user
  loggingIn: PropTypes.bool, // Current meteor user logging in
  loading: PropTypes.bool // Subscription status
};

Admin.contextTypes = {
  router: PropTypes.object
};
