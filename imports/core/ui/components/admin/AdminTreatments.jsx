import React from "react";

import AdminNewTreatment from "./AdminNewTreatment.jsx";
import Loading from "../Loading";

export default class AdminTreatments extends React.Component {
  state = { newTreatmentIsOpen: false };

  render() {
    const { loading, treatments, conditions, conditionTypes } = this.props;

    if (loading) {
      return <Loading />;
    }

    return (
      <div className="treatments">
        <h2>
          <span className="pt-icon-large pt-icon-properties" /> Treatments
        </h2>
        {treatments.length === 0 ? (
          <p>No treatments yet, create some bellow.</p>
        ) : (
          <table className="pt-table pt-bordered">
            <thead>
              <tr>
                <th>Name</th>
                <th>Conditions</th>
              </tr>
            </thead>
            <tbody>
              {_.map(treatments, treatment => (
                <tr key={treatment._id}>
                  <td>{treatment.name || "-"}</td>
                  <td>
                    <table className="pt-table pt-condensed inner-table">
                      <tbody>
                        {_.map(treatment.conditions(), cond => (
                          <tr key={cond._id}>
                            <td>
                              <em>{cond.type}</em>
                            </td>
                            <td>{cond.label()}</td>
                          </tr>
                        ))}
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
          onClick={() => this.setState({ newTreatmentIsOpen: true })}
        >
          New Treatment
        </button>

        <AdminNewTreatment
          conditions={conditions}
          conditionTypes={conditionTypes}
          onClose={() => this.setState({ newTreatmentIsOpen: false })}
          isOpen={this.state.newTreatmentIsOpen}
        />
      </div>
    );
  }
}
