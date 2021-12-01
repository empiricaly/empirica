import React from "react";
import { Profile } from "./Profile";
import { Stage } from "./Stage";

export function Game() {
  return (
    <div className="h-full w-full flex flex-col pt-4">
      <Profile />
      <div className="h-full flex items-center justify-center">
        <Stage />
      </div>
    </div>
  );
}
