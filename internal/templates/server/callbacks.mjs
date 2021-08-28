const Empirica = {};

const playerCount = 2;
const stageDuration = 30;

Empirica.onNewPlayer(({ player }) => {
  console.log("new player", player.id);
});

Empirica.onPlayerConnected(function ({ player }) {
  console.log("player connected", player.id);

  if (this.unassignedPlayers.length >= playerCount) {
    admin.createBatch({
      assignment: "simple",
      treatments: [
        {
          treatment: { playerCount },
          games: 1,
          lobby: { type: "solo", duration: 300, after: "exit" },
        },
      ],
    });
  }
});

Empirica.onPlayerDisconnected(({ player }) => {
  console.log("player disconnected", player.id);
});

Empirica.onNewBatch(({ batch }) => {
  console.log("new batch");

  // batch.config => assignment === simple...

  if (this.unassignedPlayers.length < playerCount) {
    return;
  }

  const game = batch.addGame({ playerCount: 1 });

  for (const player of this.unassignedPlayers) {
    console.log("assign player");
    game.assignPlayer(player);
  }

  game.start();
});

Empirica.onGameInit(({ game }) => {
  console.log("game init");

  const round = game.addRound();
  round.set("name", "Round 1");
  round.addStage("hello", stageDuration);
  round.addStage("hello2", stageDuration);

  const round2 = game.addRound();
  round2.set("name", "Round 2");
  round2.addStage("hola3", stageDuration);
  round2.addStage("hola4", stageDuration);

  for (const player of game.players) {
    player.set("score", 0);
  }
});

Empirica.onRoundStart(({ round }) => {
  console.log("round start");
});

Empirica.onStageStart(({ stage }) => {
  console.log("stage start", stage.id);
  stage.set("hello", 1);
});

Empirica.onStageEnd(({ stage }) => {
  console.log("stage end", stage.id, stage.round);
});

Empirica.onRoundEnd(({ round }) => {
  console.log("round end");
});

Empirica.onGameEnd(({ game }) => {
  console.log("game end");
});

Empirica.onChange("player", "readyForAssigment", function ({ player }) {
  console.log("player readyForAssigment", attr.val, isNew, player);
  const batch = this.batches[0];
  if (!batch) {
    console.log("should exit player");
    return;
  }

  const games = batch.games.filter((g) => g.state === "created");
  const game = games[Math.floor(Math.random() * games.length)];
  game.assignPlayer(player);
});

Empirica.onChange("player", "ready", function ({ player }) {
  const readyPlayers = player.game.players.map((p) => p.get("ready"));
  if (readyPlayers.length < player.game.treatment.playerCount) {
    return;
  }

  const unreadyPlayers = player.game.players.map((p) => !p.get("ready"));
  tryToReassignPlayers(this.batches, unreadyPlayers, game.treatment);

  game.start();
});

Empirica.onChange("player-stage", "submit", ({ player, stage }) => {
  const players = stage.round?.game?.players;
  if (!players) {
    return;
  }

  const submitted = players.every((p) => p.stage.get("submit"));
  if (submitted) {
    stage.end();
  }
});

Empirica.onInternalChange("game", "currentStageID", ({ attr, isNew }) => {
  console.log("currentStageID change", attr.val, isNew);
});

function tryToReassignPlayers(batches, players, treatment) {} // TODO
