import { Callbacks } from "@empirica/admin";
import "./random.mjs";
import { pickRandom } from "./random.mjs";

const Empirica = new Callbacks();

Empirica.onNewPlayer(function ({ player }) {
  console.log("new player", player.id);
});

Empirica.onPlayerConnected(function ({ player }) {
  console.log("player connected", player.id, this.batches);

  if (player.currentGame) {
    return;
  }

  for (const batch of this.batches) {
    if (batch.get("state") !== "running") {
      continue;
    }
    const availableGames = batch.games.filter((g) => !g.get("state"));

    if (availableGames.length === 0) {
      continue;
    }

    const game = pickRandom(availableGames);
    game.assign(player);

    return;
  }
});

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
