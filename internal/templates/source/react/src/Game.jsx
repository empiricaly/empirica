import React from "react";
import { Profile } from "./Profile";
import { Stage } from "./Stage";

export function Game() {
  return (
    <div className="h-full w-full flex flex-col">
      <Profile />
      <div className="h-full flex items-center justify-center">
        <Stage />
      </div>
    </div>
  );
}
