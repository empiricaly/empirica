import PropTypes from "prop-types";
import React from "react";

import { AlertToaster } from "./Toasters.jsx";

export default class Login extends React.Component {
  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  componentDidMount() {
    const redirecting = this.redirectLoggedIn(this.props);
    if (redirecting) {
      return;
    }
    this.timeout = setTimeout(() => {
      this.timeout = null;
      const field = document.querySelector("input");
      if (field) {
        field.focus();
      }
    }, 100);
  }

  componentWillReceiveProps(nextProps) {
    this.redirectLoggedIn(nextProps);
  }

  redirectLoggedIn(props) {
    const { user, loggingIn } = props;
    const { router } = this.context;

    if (!loggingIn && user) {
      router.history.push(`/admin`);
      return true;
    }
  }

  handleForm = event => {
    event.preventDefault();
    const t = event.currentTarget;
    const username = t.querySelector("#username").value;
    const password = t.querySelector("#password").value;
    Meteor.loginWithPassword(username, password, err => {
      if (err) {
        AlertToaster.show({ message: String(err) });
      }
    });
  };

  render() {
    const { user, children, loggingIn } = this.props;

    if (loggingIn || user) {
      return null;
    }

    return (
      <div className="login">
        <form onSubmit={this.handleForm}>
          <h1>Log in</h1>

          <div className="pt-control-group pt-vertical">
            <div className="pt-input-group pt-large">
              <span className="pt-icon pt-icon-person" />
              <input
                type="text"
                className="pt-input"
                name="username"
                id="username"
                placeholder="Username"
              />
            </div>
            <div className="pt-input-group pt-large">
              <span className="pt-icon pt-icon-lock" />
              <input
                type="password"
                className="pt-input"
                name="password"
                id="password"
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              className="pt-button pt-large pt-intent-primary"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    );
  }
}

Login.propTypes = {
  user: PropTypes.object, // Current meteor user
  loggingIn: PropTypes.bool, // Current meteor user logging in
  loading: PropTypes.bool // Subscription status
};

Login.contextTypes = {
  router: PropTypes.object
};
