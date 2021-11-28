import React from "react";

export function Avatar({ player }) {
  return (
    <div className="flex flex-col items-center">
      <img
        className="inline-block h-18 w-18 rounded-full shadow bg-white p-3"
        src={`https://avatars.dicebear.com/v2/gridy/${player.id}.svg`}
        alt="Avatar"
      />
    </div>
  );
}
