import React from "react";

import AdminCondition from "./AdminCondition.jsx";
import AdminNewCondition from "./AdminNewCondition.jsx";
import Loading from "../Loading";

export default class AdminConditions extends React.Component {
  state = {};

  render() {
    const { loading, treatments, conditions, conditionTypes } = this.props;

    if (loading) {
      return <Loading />;
    }

    conditionTypes.map(t => {
      t.conditions = conditions.filter(c => c.type === t._id);
    });

    return (
      <div className="conditions">
        <h2>
          <span className="pt-icon-large pt-icon-property" /> Conditions
        </h2>

        <div className="conditions-list">
          {conditionTypes.map(t => {
            const hasNewForm = !(t.stringType === "Boolean" || t.allowedValues);

            return (
              <div className="pt-card condition" key={t._id}>
                {hasNewForm ? (
                  <React.Fragment>
                    <AdminNewCondition
                      type={t}
                      onClose={() =>
                        this.setState({ [`newOpen${t._id}`]: false })
                      }
                      isOpen={this.state[`newOpen${t._id}`]}
                    />
                    <button
                      type="button"
                      className="pt-button new-button pt-icon-plus"
                      onClick={() =>
                        this.setState({ [`newOpen${t._id}`]: true })
                      }
                    />
                  </React.Fragment>
                ) : (
                  ""
                )}

                <h4>{t._id}</h4>

                {t.description ? (
                  <blockquote>
                    <p>{t.description}</p>
                  </blockquote>
                ) : (
                  ""
                )}

                {t.conditions.length > 0 ? (
                  <table className="pt-table pt-condensed">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.conditions.map(condition => (
                        <AdminCondition
                          key={condition._id}
                          condition={condition}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="pt-text-muted">
                    No <code>{t._id}</code> conditions yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
