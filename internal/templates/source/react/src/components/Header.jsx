import { clear, createNewPlayer, Logo } from "@empirica/player";
import React from "react";

export function Header() {
  return (
    <div className="relative bg-white mb-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-6 md:justify-start md:space-x-10">
          <div className="flex justify-start w-10 h-10">
            <Logo />
          </div>

          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
            <button
              onClick={createNewPlayer}
              className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium text-empirica-600 bg-transparent"
            >
              New Player
            </button>
            <button
              onClick={clear}
              className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium text-empirica-600 bg-transparent"
            >
              Reset Current Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
