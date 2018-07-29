import { EditableText } from "@blueprintjs/core";
import React from "react";
import { AlertToaster } from "../Toasters.jsx";

import { updateCondition } from "../../../api/conditions/methods.js";

export default class AdminCondition extends React.Component {
  constructor(props) {
    super(props);
    this.initialName = props.condition.name;
    this.state = {
      name: props.condition.name
    };
  }

  componentWillUpdate(props) {
    if (props.name !== this.props.name) {
      this.initialName = props.condition.name;
      this.setState({ name: props.condition.name });
    }
  }

  handleNameChange = name => {
    this.setState({ name });
  };

  handleNameConfirm = () => {
    const { _id } = this.props.condition;
    const { name } = this.state;
    if (!name || name.trim() === "") {
      this.setState({ name: this.props.condition.name });
      return;
    }
    updateCondition.call({ _id, name }, err => {
      if (err) {
        AlertToaster.show({ message: String(err) });
        this.handleNameChange(this.initialName);
        return;
      }
      this.initialName = name;
    });
  };

  render() {
    const { condition } = this.props;
    const { name } = this.state;
    return (
      <tr key={condition._id}>
        <td>
          <EditableText
            onChange={this.handleNameChange}
            onConfirm={this.handleNameConfirm}
            value={name}
          />
        </td>
        <td>{String(condition.value)}</td>
      </tr>
    );
  }
}
