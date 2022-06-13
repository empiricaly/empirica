import React from "react";
import { isDevelopment } from "../utils";

export function NoGames() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-92 flex flex-col items-center">
        <h2 className="text-gray-700 font-medium">No experiments available</h2>
        <p className="mt-2 text-gray-400 text-justify">
          There are currently no available experiments. Please wait until an
          experiment becomes available or come back at a later date.
        </p>
        {isDevelopment ? (
          <p className="mt-4 text-gray-700">
            Go to{" "}
            <a
              href="/admin"
              target="empirica-admin"
              className="text-empirica-500"
            >
              Admin
            </a>{" "}
            to get started
          </p>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
