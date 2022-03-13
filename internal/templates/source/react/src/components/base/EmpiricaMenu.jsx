import { clear, createNewPlayer, isDevelopment, Logo } from "@empirica/player";
import React from "react";

export function EmpiricaMenu() {
  return (
    <div className="group fixed top-full left-full -mt-20 -ml-20 rounded-lg bg-white z-20">
      <div className="w-14 h-14 p-2  text-empirica-500 shadow rounded-lg group-hover:shadow-none">
        <Logo />
      </div>
      <div className="hidden group-hover:block absolute rounded-lg overflow-hidden bottom-0 right-0 shadow">
        <div className="text-gray-400 bg-gray-100  overflow-hidden">
          {isDevelopment || true ? (
            <div>
              <button
                onClick={createNewPlayer}
                className="whitespace-nowrap hover:text-empirica-600 w-full py-2 pl-4 pr-6 text-left"
              >
                New Player
              </button>
              <button
                onClick={clear}
                className="whitespace-nowrap hover:text-empirica-600 w-full py-2 pl-4 pr-6 text-left"
              >
                Reset Current Session
              </button>
              <a
                target="_blank"
                href="https://docs.empirica.ly"
                className="whitespace-nowrap block hover:text-empirica-600 w-full py-2 pl-4 pr-6 text-left"
              >
                Documentation
              </a>
            </div>
          ) : (
            <></>
          )}

          <div className="bg-white">
            <a
              target="_blank"
              href="https://empirica.ly"
              className="whitespace-nowrap block hover:text-empirica-600 w-full py-2 pl-4 pr-6 text-left"
            >
              About Empirica
            </a>
            <button
              onClick={clear}
              className="whitespace-nowrap hover:text-empirica-600 w-full py-2 pl-4 pr-6 text-left"
            >
              About this Experiment
            </button>
          </div>

          <a
            target="_blank"
            href="https://empirica.ly"
            className="text-empirica-500 hover:text-empirica-600 bg-white flex justify-between items-center cursor-pointer"
          >
            <div className="px-4 text-lg font-medium w-full">Empirica</div>
            <div className="w-14 h-14 p-2 flex-shrink-0 bg-white">
              <Logo />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
