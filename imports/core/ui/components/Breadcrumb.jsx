import React from "react";

export default class Breadcrumb extends React.Component {
  render() {
    const { round, stage } = this.props;

    return (
      <nav className="round-nav">
        <ul className="pt-breadcrumbs">
          <li>
            <span className="pt-breadcrumb">Round {round.index + 1}</span>
          </li>
          {round.stages.map(s => {
            const current =
              s.name === stage.name ? "pt-breadcrumb-current" : "pt-disabled";
            return (
              <li key={s.name}>
                <span className={`pt-breadcrumb ${current}`}>
                  {s.displayName}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
}
