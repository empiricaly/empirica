import React from "react";
import moment from "moment";

import { Menu, MenuItem, Popover, Position } from "@blueprintjs/core";

import { assignmentTypes, maxGamesCount } from "../../../api/batches/batches";
import {
  createBatch,
  updateBatchStatus,
  duplicateBatch,
  setBatchInDebugMode
} from "../../../api/batches/methods";
import Loading from "../Loading";
import AdminNewBatch from "./AdminNewBatch";

export default class AdminBatches extends React.Component {
  state = {
    newIsOpen: false
  };

  handleStatusChange = (_id, status, debugMode, event) => {
    event.preventDefault();
    if (
      (Meteor.isDevelopment || Meteor.settings.public.debug_gameDebugMode) &&
      status === "running" &&
      // mac: metaKey (command), window: ctrlKey (Ctrl)
      (event.ctrlKey || event.metaKey || debugMode)
    ) {
      setBatchInDebugMode.call({ _id });
    }
    updateBatchStatus.call({ _id, status });
  };

  handleDuplicate = (_id, event) => {
    event.preventDefault();
    duplicateBatch.call({ _id });
  };

  render() {
    const {
      loading,
      batches,
      treatments,
      conditions,
      lobbyConfigs
    } = this.props;

    const { newIsOpen } = this.state;

    if (loading) {
      return <Loading />;
    }

    return (
      <div className="batches">
        <h2>
          <span className="pt-icon-large pt-icon-layers" /> Batches
        </h2>

        {batches.length === 0 ? (
          <p>No batches yet, create one bellow.</p>
        ) : (
          <table className="pt-table pt-html-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Game Count</th>
                <th>Created</th>
                <th>Assignment</th>
                <th>Configuration</th>
                <th>{/* Actions */}</th>
              </tr>
            </thead>

            <tbody>
              {batches.map(batch => {
                const actions = [];

                if (batch.status === "init") {
                  actions.push(
                    <div
                      className="pt-button-group pt-minimal pt-small"
                      key="start"
                    >
                      <button
                        type="button"
                        className="pt-button pt-intent-success pt-icon-play"
                        onClick={this.handleStatusChange.bind(
                          this,
                          batch._id,
                          "running",
                          false
                        )}
                      >
                        Start
                      </button>

                      {/* {Meteor.isDevelopment ||
                      Meteor.settings.public.debug_gameDebugMode ? (
                        <Popover
                          content={
                            <Menu>
                              <MenuItem
                                text="Start in Debug Mode"
                                onClick={this.handleStatusChange.bind(
                                  this,
                                  batch._id,
                                  "running",
                                  true
                                )}
                              />
                            </Menu>
                          }
                          position={Position.RIGHT_TOP}
                        >
                          <button
                            type="button"
                            className="pt-button pt-intent-success pt-icon-caret-down"
                          />
                        </Popover>
                      ) : null} */}
                    </div>
                  );
                }

                if (batch.status === "init" || batch.status === "running") {
                  actions.push(
                    <button
                      type="button"
                      className="pt-button pt-small pt-icon-stop pt-minimal"
                      key="stop"
                      onClick={this.handleStatusChange.bind(
                        this,
                        batch._id,
                        "cancelled",
                        false
                      )}
                    >
                      Cancel
                    </button>
                  );
                }

                if (
                  batch.status === "finished" ||
                  batch.status === "cancelled"
                ) {
                  actions.push(
                    <button
                      type="button"
                      className="pt-button pt-small pt-icon-duplicate pt-minimal"
                      key="repeat"
                      onClick={this.handleDuplicate.bind(this, batch._id)}
                    >
                      Duplicate
                    </button>
                  );
                }

                let config;
                switch (batch.assignment) {
                  case "simple":
                    config = batch.simpleConfig.treatments.map(tt => {
                      const t = treatments.find(t => t._id === tt._id);
                      return (
                        <div key={tt._id}>
                          {t ? t.displayName() : "Unknown treatment"}
                        </div>
                      );
                    });
                    break;
                  case "complete":
                    config = batch.completeConfig.treatments.map(tt => {
                      const t = treatments.find(t => t._id === tt._id);
                      return (
                        <div key={tt._id}>
                          {t ? t.displayName() : "Unknown treatment"}
                          {" x "}
                          {tt.count}
                        </div>
                      );
                    });
                    break;
                  default:
                    console.error("unknown assignment");
                    break;
                }

                let statusIntent;
                switch (batch.status) {
                  case "init":
                    statusIntent = "pt-intent-warning";
                    // Default style
                    break;
                  case "running":
                    statusIntent = "pt-intent-success";
                    break;
                  case "finished":
                    statusIntent = "pt-intent-success pt-minimal";
                    break;
                  case "stopped":
                  case "cancelled":
                    statusIntent = "pt-intent-danger pt-minimal";
                    break;
                  default:
                    statusIntent = "pt-minimal";
                    break;
                }

                return (
                  <tr key={batch._id}>
                    <td>
                      <span className={`pt-tag ${statusIntent}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="numeric">{batch.gameCount()}</td>
                    <td title={moment(batch.createdAt).format()}>
                      {moment(batch.createdAt).fromNow()}
                    </td>
                    <td>{assignmentTypes[batch.assignment]}</td>
                    <td>{config}</td>
                    <td>
                      <div className="button-group">{actions}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <button
          type="button"
          className="pt-button"
          onClick={() => this.setState({ newIsOpen: true })}
        >
          New Batch
        </button>

        <AdminNewBatch
          treatments={treatments}
          conditions={conditions}
          lobbyConfigs={lobbyConfigs}
          isOpen={newIsOpen}
          onClose={() => this.setState({ newIsOpen: false })}
        />
      </div>
    );
  }
}
