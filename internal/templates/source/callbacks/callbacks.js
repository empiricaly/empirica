import { Callbacks } from "@empirica/admin";

const Empirica = new Callbacks();

Empirica.onGameStart(function ({ game }) {
  console.log("game start");

  for (let i = 0; i < 3; i++) {
    const round = game.addRound({ name: `Round ${i + 1}` });
    round.addStage({ name: "Response", duration: 20 });
    round.addStage({ name: "Result", duration: 10 });

    if (game.players.length > 1) {
      round.addStage({ name: "Neighbors", duration: 20 });
    }
  }

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
});

Empirica.onRoundEnd(function ({ round }) {
  for (const player of round.game.players) {
    const prevScore = player.get("score");
    const roundScore = player.round.get("value") || 0;
    player.set("score", prevScore + roundScore);
  }
});

Empirica.onGameEnd(function ({ game }) {
  console.log("game end");
});

export default Empirica;
