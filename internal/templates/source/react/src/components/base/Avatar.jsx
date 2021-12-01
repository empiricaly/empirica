import React from "react";

export function Avatar({ player }) {
  return (
    <div className="flex flex-col items-center">
      <img
        className="inline-block h-11 w-11 rounded-full shadow bg-white p-2"
        src={`https://avatars.dicebear.com/v2/gridy/${player.id}.svg`}
        alt="Avatar"
      />
    </div>
  );
}
