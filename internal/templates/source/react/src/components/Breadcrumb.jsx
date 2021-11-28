import { useRound, useStage } from "@empirica/player";
import React from "react";

export function Breadcrumb() {
  const round = useRound();
  const stage = useStage();

  return (
    <div className="py-4">
      <nav className="flex" aria-label="Breadcrumb">
        <ol role="list" className="flex text-gray-400 items-center space-x-2">
          <li>
            <div className="flex">
              <div href="#" className="text-sm font-medium">
                {round ? round.get("name") : ""}
              </div>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg
                className="flex-shrink-0 h-5 w-5 text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <div href="#" className="ml-2 text-sm font-medium">
                {stage ? stage.get("name") : stage}
              </div>
            </div>
          </li>
        </ol>
      </nav>
    </div>
  );
}
