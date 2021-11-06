import { clear, createNewPlayer, Logo } from "@empirica/player";
import React from "react";

export function Menu() {
  return (
    <div className="group fixed top-full left-full -mt-20 -ml-20 rounded-md bg-white">
      <div className="w-14 h-14 p-2  text-empirica-500">
        <Logo />
      </div>
      <div className="hidden group-hover:block absolute bottom-0 right-0">
        <div className="text-gray-400 bg-white bg-opacity-80 rounded-md overflow-hidden">
          <div className="">
            <button
              onClick={createNewPlayer}
              className="whitespace-nowrap hover:text-empirica-600 hover:bg-gray-100 w-full py-2 pl-4 pr-6 text-left"
            >
              New Player
            </button>
            <button
              onClick={clear}
              className="whitespace-nowrap hover:text-empirica-600 hover:bg-gray-100 w-full py-2 pl-4 pr-6 text-left"
            >
              Reset Current Session
            </button>
          </div>

          <a
            target="_blank"
            href="https://empirica.ly"
            className="text-empirica-500 hover:text-empirica-600 rounded-md bg-white flex justify-between items-center cursor-pointer"
          >
            <div className="px-4 text-lg font-medium w-full">Empirica</div>
            <div className="w-14 h-14 p-2 flex-shrink-0 rounded-md bg-white">
              <Logo />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
