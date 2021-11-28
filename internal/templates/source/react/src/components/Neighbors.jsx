import { usePlayer, usePlayers } from "@empirica/player";
import React from "react";

export function Neighbors() {
  const player = usePlayer();
  const players = usePlayers().filter((p) => p.id !== player.id);

  if (players.length === 0) {
    return <></>;
  }

  return (
    <div className="mt-12 flex flex-col items-center">
      <h1 className="text-lg font-bold">Others</h1>
      {players.map((p) => (
        <div key={p.id} className="flex">
          <div className="mt-1 flex items-center">
            <img
              className="inline-block h-4 w-4 rounded-md"
              src={`https://avatars.dicebear.com/v2/gridy/${p.id}.svg`}
              alt="Avatar"
            />
            <p className="text-lg ml-1">{p.get("score")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
