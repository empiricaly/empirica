import { Hooks } from "@empirica/admin";

const Empirica = new Hooks();

const playerCount = 2;

Empirica.onNewPlayer(function ({ player }) {
  console.log("new player", player.id);
});

Empirica.onPlayerConnected(function ({ player }) {
  console.log("player connected", player.id);

  console.log("this.unassignedPlayers.length", this.unassignedPlayers.length);

  if (this.unassignedPlayers.length >= playerCount) {
    this.createBatch({
      config: {
        kind: "simple",
        treatments: [
          {
            count: 1,
            treatment: {
              playerCount,
            },
          },
        ],
      },
    });
  }
});

Empirica.onPlayerDisconnected(function ({ player }) {
  console.log("player disconnected", player.id);
});

Empirica.onNewBatch(function ({ batch }) {
  console.log("new batch");

  console.log("this.unassignedPlayers.length", this.unassignedPlayers.length);

  if (this.unassignedPlayers.length < playerCount) {
    console.log("not enough players");
    return;
  }

  const game = batch.addGame({ playerCount });

  for (const player of this.unassignedPlayers.slice(0, playerCount)) {
    console.log("assign player");
    game.assign(player);
  }

  game.start();
});

Empirica.onChange("player", "introDone", function ({ attr, isNew, player }) {
  console.log("player readyForAssigment", attr.val, isNew, player);
});

Empirica.onNew("player-stage", "submit", function ({ player, stage }) {
  const players = player.currentGame.players;
  if (!players || players.length === 0) {
    console.warn("no players");
    return;
  }

  console.log(
    "submits",
    players.map((p) => p.stage.get("submit"))
  );

  const submitted = players.every((p) => p.stage.get("submit"));
  if (submitted) {
    stage.end();
  }
});

Empirica.onNew("game", "currentStageID", function ({ game }) {
  console.log("currentStageID new", game.get("currentStageID"));
});

Empirica.onChange("game", "currentStageID", function ({ game }) {
  console.log("currentStageID change", game.get("currentStageID"));
});

export default Empirica;
