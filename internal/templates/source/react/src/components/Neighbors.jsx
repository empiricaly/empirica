import { usePlayer, usePlayers } from "@empirica/player";
import React from "react";
import { Avatar } from "./base/Avatar";
import { Button } from "./base/Button";

export function Neighbors() {
  const player = usePlayer();
  const players = usePlayers().filter((p) => p.id !== player.id);

  if (players.length === 0) {
    return <></>;
  }

  return (
    <div className="h-full">
      <div className="mt-12 space-y-8 rounded text-center">
        <h1 className="text-lg text-gray-500 font-medium">
          Others players' results
        </h1>

        <div className="grid grid-cols-2 items-center gap-x-6">
          {players.map((p) => (
            <>
              <div key={p.id} className="flex justify-end">
                <div className="h-20 w-20">
                  <Avatar player={p} />
                </div>
              </div>
              <div key={p.id + "val"} className="flex justify-start">
                <p className="text-gray-500 text-4xl font-semibold leading-none font-mono">
                  {p.round.get("value")}
                </p>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
