import React from "react";

import TaskResponse from "./TaskResponse";
import TaskStimulus from "./TaskStimulus";

export default class Task extends React.Component {
  render() {
    const { game, round, stage, player } = this.props;

    return (
      <div className="task">
        <TaskStimulus round={round} stage={stage} player={player} />
        <TaskResponse round={round} stage={stage} player={player} game={game} />
      </div>
    );
  }
}
