export const init = (treatment, players) => {
  players.forEach((player, i) => {
    player.set("avatar", `/avatars/jdenticon/${player._id}`);
    player.set("score", 0);
  });

  const rounds = [];
  _.times(10, i => {
    const stages = [
      {
        name: "response",
        displayName: "Response",
        durationInSeconds: 120
      }
    ];

    rounds.push({
      stages
    });
  });

  return {
    rounds,
    players
  };
};
