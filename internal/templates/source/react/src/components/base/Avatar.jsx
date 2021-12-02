import React from "react";

export function Avatar({ player }) {
  return (
    <img
      className="inline-block h-full w-full rounded-full shadow bg-white p-2"
      src={`https://avatars.dicebear.com/v2/gridy/${player.id}.svg`}
      alt="Avatar"
    />
  );
}
