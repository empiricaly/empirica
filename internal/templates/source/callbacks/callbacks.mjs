import { Callbacks } from "@empirica/admin";

const Empirica = new Callbacks();

const stageDuration = 20;

Empirica.onGameInit(function ({ game }) {
  console.log("game init");

  for (let i = 0; i < 2; i++) {
    const round = game.addRound({ name: `Round ${i + 1}` });
    round.addStage({ name: "Test", duration: stageDuration });
    round.addStage({ name: "Result", duration: stageDuration });
  }

  for (const player of game.players) {
    player.set("score", 0);
  }

  console.log("game init done");
});

Empirica.onRoundStart(function ({ round }) {
  console.log("round start");
});

Empirica.onStageStart(function ({ stage }) {
  console.log("stage start");
  stage.set("hello", 1);
});

Empirica.onStageEnd(function ({ stage }) {
  console.log("stage end");
});

Empirica.onRoundEnd(function ({ round }) {
  console.log("round end");
});

Empirica.onGameEnd(function ({ game }) {
  console.log("game end");
});

export default Empirica;
