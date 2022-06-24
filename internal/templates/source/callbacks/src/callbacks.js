export default function (empirica) {
  empirica.on("game", "start", (ctx, { game }) => {
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

    for (const player of game.players) {
      player.set("score", 0);
    }

    console.log("game start done");
  });

  empirica.on("round", "start", (ctx, { round }) => {
    console.log("round start");
  });

  empirica.on("stage", "start", (ctx, { stage }) => {
    console.log("stage start");
  });

  empirica.on("stage", "ended", (ctx, { stage }) => {
    console.log("stage end");
    calculateJellyBeansScore(stage);
  });

  empirica.on("round", "ended", (ctx, { round }) => {});

  empirica.on("game", "ended", (ctx, { game }) => {
    console.log("game end");
  });
}

const jellyBeansCount = 1623;

function calculateJellyBeansScore(stage) {
  if (
    stage.get("name") !== "Answer" ||
    stage.round.get("task") !== "jellybeans"
  ) {
    return;
  }

  for (const player of stage.currentGame.players) {
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
