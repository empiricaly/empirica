import React from "react";

import { AlertToaster } from "./Toasters.jsx";
import { DevNote } from "./Helpers";
import { config } from "../../../experiment/client";
import { createPlayer } from "../../api/players/methods";
import { setPlayerId } from "../containers/IdentifiedRoute";
import Centered from "./Centered.jsx";

const { ConsentComponent } = config;
import Loading from "./Loading.jsx";
const { playerIdParam } = Meteor.settings.public;

export default class NewPlayer extends React.Component {
  state = { id: "", consented: false };

  componentDidUpdate(prevProps, prevState) {
    if (this.state.consented && !prevState.consented) {
      this.timeout = setTimeout(() => {
        this.timeout = null;
        if (this.idField) {
          this.idField.focus();
        }
      }, 100);
    }
  }

  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  handleIdUpdate = event => {
    this.setState({ id: this.idField.value });
  };

  handleForm = event => {
    event.preventDefault();
    const { id } = this.state;

    createPlayer.call({ id }, (err, _id) => {
      if (err) {
        console.error(err);
        AlertToaster.show({ message: String(err) });
        return;
      }

      setPlayerId(_id);
    });
  };

  handleConsent = () => {
    this.setState({ consented: true });

    const { playerIdParam } = Meteor.settings.public;

    if (playerIdParam) {
      const id = new URL(document.location).searchParams.get(playerIdParam);
      if (id) {
        this.setState({ attemptingAutoLogin: true });
        createPlayer.call({ id }, (err, _id) => {
          if (err) {
            this.setState({ attemptingAutoLogin: false });
            console.error(err);
            AlertToaster.show({ message: String(err) });
            return;
          }

          setPlayerId(_id);
        });
      }
    }
  };

  render() {
    const { id, consented, attemptingAutoLogin } = this.state;

    if (attemptingAutoLogin) {
      return <Loading />;
    }

    if (!consented && ConsentComponent) {
      return <ConsentComponent onConsent={this.handleConsent} />;
    }

    return (
      <Centered>
        <div className="new-player">
          <form onSubmit={this.handleForm}>
            <h1>Identification</h1>

            <div className="pt-form-group">
              <label className="pt-label" htmlFor="id">
                Player ID
              </label>
              <div className="pt-form-content">
                <input
                  className="pt-input"
                  type="text"
                  name="id"
                  id="id"
                  value={id}
                  onChange={this.handleIdUpdate}
                  ref={el => (this.idField = el)}
                  placeholder="e.g. john@example.com"
                  required
                />

                <div className="pt-form-helper-text">
                  Enter your player identification{" "}
                  <span className="pt-text-muted">
                    (provided ID, MTurk ID, etc.)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-form-group">
              <button className="pt-button pt-icon-key-enter" type="submit">
                Submit
              </button>
            </div>
          </form>

          <DevNote>
            Maybe here we have a couple of options in the batch to configure
            this form.
          </DevNote>
        </div>
      </Centered>
    );
  }
}
