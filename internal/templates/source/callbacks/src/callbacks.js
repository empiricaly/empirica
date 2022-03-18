import { Callbacks } from "@empirica/admin";

const Empirica = new Callbacks();
export default Empirica;

Empirica.onGameStart(function ({ game }) {
  console.log("game start");

  // Jelly beans

  const round = game.addRound({
    name: "Round 1 - Jelly Beans",
    task: "jellybeans",
  });
  round.addStage({ name: "Answer", duration: 300 });
  round.addStage({ name: "Result", duration: 120 });

  // Minesweeper

  const round2 = game.addRound({
    name: "Round 2 - Minesweeper",
    task: "minesweeper",
  });
  round2.addStage({ name: "Play", duration: 300 });

  // // Public Goods

  // const round3 = game.addRound({
  //   name: "Round 3 - Public Goods",
  //   task: "publicgoods",
  // });
  // round3.addStage({ name: "Answer", duration: 300 });
  // round3.addStage({ name: "Result", duration: 120 });

  // Set initial player scores to 0

  for (const player of game.players) {
    player.set("score", 0);
  }

  console.log("game start done");
});

Empirica.onRoundStart(function ({ round }) {
  console.log("round start");
});

Empirica.onStageStart(function ({ stage }) {
  console.log("stage start");
});

Empirica.onStageEnd(function ({ stage }) {
  console.log("stage end");
  calculateJellyBeansScore(stage);
});

Empirica.onRoundEnd(function ({ round }) {});

Empirica.onGameEnd(function ({ game }) {
  console.log("game end");
});

const jellyBeansCount = 1623;

function calculateJellyBeansScore(stage) {
  if (
    stage.get("name") !== "Answer" ||
    stage.round.get("task") !== "jellybeans"
  ) {
    return;
  }

  for (const player of stage.round.game.players) {
    let roundScore = 0;

    const playerGuess = player.round.get("guess");

    if (playerGuess) {
      const deviation = Math.abs(playerGuess - jellyBeansCount);
      const score = Math.round((1 - deviation / jellyBeansCount) * 10);
      roundScore = Math.max(0, score);
    }

    player.round.set("score", player.get("score") + roundScore);
    player.set("score", player.get("score") + roundScore);
  }
}
