import { ClassicListenersCollector } from "@empirica/core/admin/classic";
export const Empirica = new ClassicListenersCollector();

Empirica.onGameStart(({ game }) => {
  const { roundCount, stageCount } = game.get("treatment");

  for (let i = 0; i < roundCount; i++) {
    const round = game.addRound({ name: `Round ${i}` });
    for (let j = 0; j < stageCount; j++) {
      round.addStage({ name: `Stage ${j}`, duration: 120 });
    }
  }
});

Empirica.on("player", "replay", async (ctx, { player, replay }) => {
  if (!replay) {
    return;
  }

  const batches = Array.from(ctx.scopesByKind("batch").values());

  for (const batch of batches) {
    if (!batch.isRunning) {
      continue;
    }

    for (const game of batch.games) {
      if (game.hasEnded) {
        continue;
      }

      console.log("REPLAYING GAME", game.id, "FOR PLAYER", player.id);
      await game.assignPlayer(player);
    }
  }

  player.set("replay", false);
});

Empirica.onRoundStart(({ round }) => {});

Empirica.onStageStart(({ stage }) => {
  // Used for test called: "attribute as bool, correct equality check"
  stage.currentGame.set("key1", false);
});

Empirica.onStageEnded(({ stage }) => {});

Empirica.onRoundEnded(({ round }) => {});

Empirica.onGameEnded(({ game }) => {});
