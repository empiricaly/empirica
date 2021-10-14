import React from "react";

export function Avatar({ player }) {
  return (
    <div className="mt-8 flex flex-col items-center">
      <img
        className="inline-block h-10 w-10 rounded-md"
        src={`https://avatars.dicebear.com/v2/gridy/${player.id}.svg`}
        alt="Avatar"
      />
    </div>
  );
}
