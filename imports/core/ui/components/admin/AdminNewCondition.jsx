import { Dialog, NumericInput } from "@blueprintjs/core";
import React from "react";

import { AlertToaster } from "../Toasters.jsx";
import { Conditions } from "../../../api/conditions/conditions.js";
import { createCondition } from "../../../api/conditions/methods.js";

export default class AdminNewCondition extends React.Component {
  state = { value: "" };

  handleIntUpdate = value => {
    this.setState({ value });
  };

  handleUpdate = event => {
    const name = event.currentTarget.name;
    const value = event.currentTarget.value;
    this.setState({ [name]: value });
  };

  handleNewCondition = event => {
    event.preventDefault();
    let { name, value } = this.state;
    const {
      type: { _id: type, stringType },
      onClose
    } = this.props;

    const params = Conditions.schema.clean(
      { type, name, value },
      { autoConvert: false }
    );

    if (stringType === "Number") {
      params.value = parseFloat(params.value);
    }

    createCondition.call(params, err => {
      if (err) {
        AlertToaster.show({ message: String(err) });
        return;
      }
      onClose();
      this.setState({});
    });
  };

  render() {
    const { isOpen, onClose, type } = this.props;
    const { name, value } = this.state;

    let input,
      isFloat = false;
    switch (type.stringType) {
      case "Number":
        input = (
          <input
            className="pt-input"
            type="number"
            name="value"
            id="value"
            step="any"
            min={type.min || -1000000000000}
            max={type.max || 1000000000000}
            value={value}
            onChange={this.handleUpdate}
            required
          />
        );
        break;
      case "Integer":
        input = (
          <NumericInput
            name="value"
            id="value"
            min={type.min || -1000000000000}
            max={type.max || 1000000000000}
            value={value}
            required
            onValueChange={this.handleIntUpdate}
          />
        );
        break;
      case "String":
        input = (
          <input
            className="pt-input"
            type="text"
            name="value"
            id="value"
            value={value}
            onChange={this.handleUpdate}
            pattern={type.regEx && type.regEx.source}
            required
          />
        );
        break;
      default:
        console.error("New Condition unsupported type:", type.stringType);
        break;
    }

    let properties = [];
    if (!_.isUndefined(type.min)) {
      properties.push(`Min: ${type.min}`);
    }
    if (!_.isUndefined(type.max)) {
      properties.push(`Max: ${type.max}`);
    }
    if (!_.isUndefined(type.regEx)) {
      properties.push(`Pattern: ${type.regEx.source}`);
    }

    return (
      <Dialog
        iconName="property"
        isOpen={isOpen}
        onClose={onClose}
        title={`New ${type._id} Condition`}
      >
        <form className="new-condition" onSubmit={this.handleNewCondition}>
          <div className="pt-dialog-body">
            <div className="pt-form-group">
              <label className="pt-label" htmlFor="name">
                Name
              </label>
              <div className="pt-form-content">
                <input
                  className="pt-input"
                  type="text"
                  name="name"
                  id="name"
                  value={name}
                  pattern={/^[a-zA-Z0-9_]+$/.source}
                  onChange={this.handleUpdate}
                  // required
                />
              </div>
              <div className="pt-form-helper-text">
                Only characters, numbers and underscore (_). No spaces.
              </div>
            </div>

            <div className="pt-form-group">
              <label className="pt-label" htmlFor="name">
                Value
              </label>
              <div className="pt-form-content">{input}</div>
              {properties.length > 0 ? (
                <div className="pt-form-helper-text">
                  {properties.join(" - ")}
                </div>
              ) : (
                ""
              )}
            </div>
          </div>
          <div className="pt-dialog-footer">
            <div className="pt-dialog-footer-actions">
              <button type="submit" className="pt-button pt-intent-primary">
                Create Condition
              </button>
            </div>
          </div>
        </form>
      </Dialog>
    );
  }
}
