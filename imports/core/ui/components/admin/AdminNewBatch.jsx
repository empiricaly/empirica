import { Dialog, NumericInput } from "@blueprintjs/core";
import { Link } from "react-router-dom";
import React from "react";

import { AlertToaster } from "../Toasters.jsx";
import {
  assignmentTypes,
  maxGamesCount
} from "../../../api/batches/batches.js";
import { createBatch } from "../../../api/batches/methods.js";

export default class AdminNewBatch extends React.Component {
  state = {
    assignment: "simple",
    simpleTreatments: [],
    completeTreatments: [],
    simpleGamesCount: 1,
    gamesCount: 1
  };

  gamesCountCalc(assignment, completeTreatments, simpleGamesCount) {
    return assignment === "complete"
      ? _.inject(completeTreatments, (sum, t) => (t.count || 0) + sum, 0)
      : simpleGamesCount;
  }

  handleAssignmentChange = event => {
    const { completeTreatments, simpleGamesCount } = this.state;
    const assignment = event.currentTarget.value;
    this.setState({
      assignment,
      gamesCount: this.gamesCountCalc(
        assignment,
        completeTreatments,
        simpleGamesCount
      )
    });
  };

  handleGamesCountChange = simpleGamesCount => {
    this.setState({
      simpleGamesCount,
      gamesCount: simpleGamesCount
    });
  };

  handleAddTreatment = event => {
    event.preventDefault();

    const { lobbyConfigs } = this.props;
    const { assignment, simpleGamesCount } = this.state;

    const key = `${assignment}Treatments`;
    const _id = this.treatmentRef.value;
    if (!_id) {
      return;
    }

    const params = {};
    const existing = this.state[key].find(tt => tt._id === _id);
    const treatment = existing || {
      _id,
      count: 1,
      lobbyConfigId: !_.isEmpty(lobbyConfigs) && lobbyConfigs[0]._id
    };

    if (!existing) {
      this.state[key].push(treatment);
    } else {
      existing.count++;
    }
    params[key] = this.state[key];
    if (assignment === "complete") {
      params.gamesCount = this.state.gamesCount + 1;
    }
    this.setState(params);
  };

  handleTreatmentCountChange = (id, count) => {
    const { assignment, completeTreatments, simpleGamesCount } = this.state;

    const key = `${assignment}Treatments`;
    const t = this.state[key].find(tt => tt._id === id);
    t.count = count;

    const params = { [key]: this.state[key] };
    if (assignment === "complete") {
      params.gamesCount = this.gamesCountCalc(
        assignment,
        this.state[key],
        simpleGamesCount
      );
    }

    this.setState(params);
  };

  handleLobbyConfigChange = (id, event) => {
    const {
      currentTarget: { value: lobbyConfigId }
    } = event;
    const { assignment, completeTreatments } = this.state;

    const key = `${assignment}Treatments`;
    const t = this.state[key].find(tt => tt._id === id);
    t.lobbyConfigId = lobbyConfigId;

    this.setState({ [key]: this.state[key] });
  };

  handleRemoveTreatment = event => {
    event.preventDefault();

    const { assignment, simpleGamesCount, gamesCount } = this.state;
    const key = `${assignment}Treatments`;

    const id = event.currentTarget.dataset.id;
    const treatment = this.state[key].find(t => t._id === id);
    const val = _.reject(this.state[key], t => t._id === id);
    const params = { [key]: val };

    if (assignment === "complete") {
      params.gamesCount = gamesCount - treatment.count;
    }

    this.setState(params);
  };

  handleNewBatch = event => {
    event.preventDefault();
    const {
      assignment,
      simpleGamesCount,
      simpleTreatments,
      completeTreatments
    } = this.state;
    const params = { assignment };

    switch (assignment) {
      case "simple":
        const treatments = simpleTreatments.map(t =>
          _.pick(t, "_id", "lobbyConfigId")
        );
        params.simpleConfig = {
          treatments,
          count: simpleGamesCount
        };
        break;
      case "complete":
        params.completeConfig = {
          treatments: completeTreatments
        };
        break;
      default:
        AlertToaster.show({ message: "unknown assignement type?!" });
        return;
    }

    createBatch.call(params, err => {
      if (err) {
        console.error(JSON.stringify(err));
        AlertToaster.show({ message: String(err) });
        return;
      }

      this.setState({
        simpleTreatments: [],
        completeTreatments: [],
        simpleGamesCount: 1,
        gamesCount: 1
      });
      this.props.onClose();
    });
  };

  renderRequired() {
    const { treatments, lobbyConfigs } = this.props;

    const issues = [];

    if (_.isEmpty(treatments)) {
      issues.push(<Link to="/admin/treatments">Create a Treatment</Link>);
    }

    if (_.isEmpty(lobbyConfigs)) {
      issues.push(
        <Link to="/admin/lobby-configurations">
          Create a Lobby Configuration
        </Link>
      );
    }

    return (
      <div className="pt-dialog-body">
        You must first:
        <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
      </div>
    );
  }

  renderContent() {
    const { treatments, conditions, lobbyConfigs } = this.props;

    const {
      gamesCount,
      assignment,
      simpleTreatments,
      completeTreatments
    } = this.state;

    const isComplete = assignment === "complete";
    const currentTreatments = isComplete
      ? completeTreatments
      : simpleTreatments;

    return (
      <form className="new-batch" onSubmit={this.handleNewBatch}>
        <div className="pt-dialog-body">
          <div className="pt-form-group">
            <label className="pt-label" htmlFor="assignment">
              Assignment Method
            </label>
            <div className="pt-form-content">
              <div className="pt-select">
                <select
                  className="pt-input"
                  name="assignment"
                  id="assignment"
                  onChange={this.handleAssignmentChange}
                  value={assignment}
                >
                  {_.map(assignmentTypes, (name, key) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-form-group">
            <label className="pt-label">Treatments</label>
            <div className="pt-form-content">
              {currentTreatments.length > 0 ? (
                <table className="pt-table pt-table-bordered pt-html-table pt-html-table-bordered">
                  <thead>
                    <tr>
                      <th>Treatment</th>
                      <th>Lobby Configuration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {_.map(currentTreatments, t => {
                      const id = `gamesCount${t._id}`;
                      const treatment = treatments.find(tt => tt._id === t._id);
                      return (
                        <tr key={id}>
                          <td>{treatment.displayName()} </td>

                          <td>
                            <div className="pt-select">
                              <select
                                name="lobbyConfigId"
                                id="lobbyConfigId"
                                onChange={this.handleLobbyConfigChange.bind(
                                  this,
                                  t._id
                                )}
                                value={t.lobbyConfigId}
                                style={{ width: 250 }}
                              >
                                {_.map(lobbyConfigs, l => (
                                  <option key={l._id} value={l._id}>
                                    {l.displayName()}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td>
                            {isComplete ? (
                              <NumericInput
                                name={id}
                                id={id}
                                min="1"
                                max={maxGamesCount}
                                stepSize="1"
                                onValueChange={this.handleTreatmentCountChange.bind(
                                  this,
                                  t._id
                                )}
                                value={t.count}
                              />
                            ) : (
                              ""
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="pt-button pt-intent-danger"
                              onClick={this.handleRemoveTreatment}
                              data-id={t._id}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                ""
              )}

              {currentTreatments.length === 0 ? (
                <p className="pt-text-muted">No treatments yet, add one:</p>
              ) : (
                ""
              )}

              <div className="pt-select" style={{ marginTop: 20 }}>
                <select
                  name="treatment"
                  id="treatment"
                  ref={i => (this.treatmentRef = i)}
                  onChange={this.handleAddTreatment}
                  value={""}
                  style={{ width: 250 }}
                >
                  <option value="">Add a new treatment...</option>
                  {_.map(treatments, tr => (
                    <option key={tr._id} value={tr._id}>
                      {tr.displayName()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-form-group">
            <label className="pt-label" htmlFor="gamesCount">
              Game Count
            </label>
            {assignment === "complete" ? (
              <div className="pt-form-content">{gamesCount}</div>
            ) : (
              <div className="pt-form-content">
                <NumericInput
                  name="gamesCount"
                  id="gamesCount"
                  min="1"
                  max={maxGamesCount}
                  stepSize="1"
                  onValueChange={this.handleGamesCountChange}
                  value={gamesCount}
                />

                <div className="pt-form-helper-text">
                  The total number of games to run
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="pt-dialog-footer">
          <div className="pt-dialog-footer-actions">
            <button type="submit" className="pt-button pt-intent-primary">
              Create Batch
            </button>
          </div>
        </div>
      </form>
    );
  }

  render() {
    const { isOpen, onClose, treatments, lobbyConfigs } = this.props;

    const content =
      _.isEmpty(treatments) || _.isEmpty(lobbyConfigs)
        ? this.renderRequired()
        : this.renderContent();

    return (
      <Dialog
        iconName="layers"
        isOpen={isOpen}
        onClose={onClose}
        title="New Batch"
        style={{ width: 700 }}
      >
        {content}
      </Dialog>
    );
  }
}
