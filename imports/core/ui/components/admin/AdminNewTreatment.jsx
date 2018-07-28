import { Dialog, RadioGroup, Radio } from "@blueprintjs/core";
import { Link } from "react-router-dom";
import React from "react";

import { AlertToaster } from "../Toasters.jsx";
import { createTreatment } from "../../../api/treatments/methods.js";

export default class AdminNewTreatment extends React.Component {
  state = { selected: {} };

  handleNameChange = () => {
    const name = this.nameField.value;
    this.setState({ name });
  };

  handleConditionChange = (type, event) => {
    const conditionId = event.currentTarget.value;
    const selected = {
      ...this.state.selected,
      [type]: conditionId
    };
    this.setState({ selected });
  };

  handleNewTreatment = event => {
    const { onClose } = this.props;
    const { name, selected } = this.state;
    event.preventDefault();

    const keys = _.compact(_.keys(selected));
    const conditionIds = _.compact(_.values(selected));

    if (keys.length !== conditionIds.length) {
      const missing = keys.join(", ");
      const msg = `A value for each condition must be selected. (missing: ${missing})`;
      AlertToaster.show({ message: msg });
      return;
    }

    const params = { name, conditionIds };
    createTreatment.call(params, err => {
      if (err) {
        if (err.details) {
          try {
            const details = JSON.parse(err.details);
            const out = details[0].details
              .map(er => {
                switch (er.type) {
                  case "required":
                    return `${er.name} is required.`;
                  default:
                    console.error("unknown error type", er);
                }
              })
              .join(" ");
            AlertToaster.show({ message: out });
          } catch (e) {
            console.error(JSON.stringify(err));
            AlertToaster.show({ message: String(err.message) });
          }
        } else {
          AlertToaster.show({ message: String(err.message) });
        }
        return;
      }
      onClose();
      this.setState({
        name: "",
        selected: {}
      });
    });
  };

  render() {
    const { isOpen, conditions, conditionTypes, onClose } = this.props;
    const { name, selected } = this.state;

    return (
      <Dialog
        iconName="properties"
        isOpen={isOpen}
        onClose={onClose}
        title="New Treatment"
      >
        <form className="new-treatment" onSubmit={this.handleNewTreatment}>
          <div className="pt-dialog-body">
            <div className="pt-form-group">
              <label className="pt-label" htmlFor="name">
                Name (optional)
              </label>
              <div className="pt-form-content">
                <input
                  className="pt-input"
                  type="text"
                  name="name"
                  id="name"
                  value={name}
                  onChange={this.handleNameChange}
                  ref={e => (this.nameField = e)}
                  pattern={/^[a-zA-Z0-9_]+$/.source}
                />
              </div>
            </div>

            {_.map(conditionTypes, type => {
              const conds = _.filter(
                conditions,
                cond => cond.type === type._id
              );
              const required = !type.optional;
              const requiredClass = required ? "required" : "";
              if (conds.length === 0) {
                return (
                  <div key={type._id} className={requiredClass}>
                    <label className="pt-label">{type._id}</label>
                    <p
                      className={`pt-callout pt-icon-${
                        required ? "warning-sign" : "info-sign"
                      } ${required ? "pt-intent-danger" : ""}`}
                    >
                      There are no condition values for the
                      {required ? <strong> required </strong> : " "}
                      {type._id} condition type yet.{" "}
                      <Link to="/admin/conditions">Add condition values</Link>.
                    </p>
                  </div>
                );
              }
              return (
                <RadioGroup
                  key={type._id}
                  label={type._id}
                  onChange={this.handleConditionChange.bind(this, type._id)}
                  selectedValue={selected[type._id]}
                  inline={true}
                  className={requiredClass}
                >
                  {_.map(conds, cond => (
                    <Radio
                      key={cond._id}
                      label={cond.label()}
                      value={cond._id}
                    />
                  ))}
                </RadioGroup>
              );
            })}
          </div>
          <div className="pt-dialog-footer">
            <div className="pt-dialog-footer-actions">
              <button type="submit" className="pt-button pt-intent-primary">
                Create Treatment
              </button>
            </div>
          </div>
        </form>
      </Dialog>
    );
  }
}
