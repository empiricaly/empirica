import { Callbacks } from "@empirica/admin";
import { pickRandom, selectRandom } from "./random.mjs";
import { deepEqual } from "./utils.mjs";

const Empirica = new Callbacks();

Empirica.onNewPlayer(function ({ player }) {
  console.log("new player", player.id);
});

Empirica.onPlayerConnected(function ({ player }) {
  console.log("player connected", player.id, this.batches);
  assignplayer(this.batches, player);
});

function assignplayer(batches, player) {
  if (player.currentGame) {
    return;
  }

  for (const batch of batches) {
    if (batch.get("state") !== "running") {
      continue;
    }
    let availableGames = batch.games.filter(
      (g) => !g.get("state") && !g.get("starting")
    );

    if (player.get("treatment")) {
      availableGames = availableGames.filter((g) =>
        deepEqual(g.get("treatment"), player.get("treatment"))
      );
    }

    if (availableGames.length === 0) {
      continue;
    }

    const game = pickRandom(availableGames);
    game.assign(player);
    player.set("treatment", game.get("treatment"));

    return;
  }
}

Empirica.onPlayerDisconnected(function ({ player }) {
  console.log("player disconnected", player.id);
});

Empirica.onNewBatch(function ({ batch }) {
  console.log("new batch", batch.attributes);

  const config = batch.get("config");

  if (!config) {
    console.warn("callbacks: batch created without a config");
    return;
  }

  if (config !== Object(config)) {
    console.warn("callbacks: batch config is not an object");
    return;
  }

  switch (config.kind) {
    case "simple":
      for (const treatment of config.treatments) {
        for (let i = 0; i < treatment.count; i++) {
          batch.addGame({ treatment: treatment.treatment });
        }
      }

      break;
    case "complete":
      for (let i = 0; i < config.count; i++) {
        const treatment = pickRandom(config.treatments);
        batch.addGame({ treatment });
      }

      break;
    default:
      console.warn("callbacks: batch created without a config");
      return;
  }

  // Hardcode to running
  batch.set("state", "running");

  // TODO add opening of the doors
  // this.global.set("open", true);

  // TODO assign players already registered and connected
});

Empirica.onChange("batch", "state", function ({ isNew, batch }) {
  switch (batch.get("state")) {
    case "running":
      console.debug("callbacks: batch running");
      break;
    case "ended":
      console.debug("callbacks: batch ended");
      break;
    case "failed":
      console.debug("callbacks: batch failed");

      for (const game of batch.games) {
        const state = game.get("state");
        if (state !== "failed" && state !== "ended" && state !== "terminated") {
          game.fail("batch terminated");
        }
      }

      break;
    case "terminated":
      console.debug("callbacks: batch terminated");

      for (const game of batch.games) {
        const state = game.get("state");
        if (state !== "failed" && state !== "ended" && state !== "terminated") {
          game.terminate("batch terminated");
        }
      }

      break;
    default:
      console.warn(`callbacks: unknown batch state: ${batch.get("state")}`);
      break;
  }
});

function checkBatchEnded(batch) {
  const gamesStileRunning = batch.games.some((g) => {
    const state = g.get("state");
    return !state || state === "running";
  });

  if (!gamesStileRunning) {
    batch.set("state", "ended");
  }
}

Empirica.onChange("game", "state", function ({ isNew, game }) {
  switch (game.get("state")) {
    case "running":
      console.debug("callbacks: game running");
      break;
    case "ended":
      console.debug("callbacks: game ended");
      checkBatchEnded(game.batch);
      break;
    case "failed":
      console.debug("callbacks: game failed");
      checkBatchEnded(game.batch);
      break;
    case "terminated":
      console.debug("callbacks: game terminated");
      checkBatchEnded(game.batch);
      break;
    default:
      console.warn(`callbacks: unknown game state: ${game.get("state")}`);
      break;
  }
});

Empirica.onChange("player", "introDone", function ({ isNew, player }) {
  console.info("player introDone", isNew, player);
  if (!player.currentGame) {
    console.warn("callbacks: introDone without game");
    return;
  }

  const game = player.currentGame;
  console.log("treatment", game.get("treatment"));
  const { playerCount } = game.get("treatment");
  const readyPlayers = game.players.filter((p) => p.get("introDone"));

  if (readyPlayers.length < playerCount) {
    console.debug("callbacks: not enough players ready yet");
    return;
  }

  game.set("starting", true);

  const players = selectRandom(readyPlayers, playerCount);
  for (const plyr of game.players) {
    if (!players.some((p) => p.id === plyr.id)) {
      game.unassign(plyr);
    }
  }

  game.start();
});

Empirica.onChange("player", "gameID", function ({ isNew, player }) {
  if (player.get("gameID")) {
    return;
  }

  assignplayer(this.batches, plyr);
});

Empirica.onChange("player-stage", "submit", function ({ player, stage }) {
  console.log("players", player);
  console.log("players", player.currentGame);
  console.log("players", player.currentGame.players);

  const players = player.currentGame.players;
  if (!players || players.length === 0) {
    console.warn("callbacks: no players onSubmit");
    return;
  }

  console.log("players", players);

  if (players.every((p) => p.stage.get("submit"))) {
    stage.end();
  }
});

export default Empirica;
