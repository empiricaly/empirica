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

Empirica.onRoundStart(({ round }) => {});

Empirica.onStageStart(({ stage }) => {});

Empirica.onStageEnded(({ stage }) => {});

Empirica.onRoundEnded(({ round }) => {});

Empirica.onGameEnded(({ game }) => {});
