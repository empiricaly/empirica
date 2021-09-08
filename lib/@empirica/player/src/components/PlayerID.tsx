import React, { FormEvent, useState } from "react";

export interface PlayerIDProps {
  onPlayerID: (playerID: string) => void;
}

export const PlayerID: React.FC<PlayerIDProps> = ({ onPlayerID }) => {
  const [playerID, setPlayerID] = useState("");

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    if (!playerID || playerID.trim() === "") {
      return;
    }

    onPlayerID(playerID);
  };

  return (
    <div className="min-h-screen bg-empirica-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Enter your Player Identifier
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form
            className="space-y-6"
            action="#"
            method="POST"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Identifier
              </label>
              <div className="mt-1">
                <input
                  id="playerID"
                  name="playerID"
                  type="text"
                  autoComplete="off"
                  required
                  autoFocus
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 sm:text-sm"
                  value={playerID}
                  onChange={(e) => setPlayerID(e.target.value)}
                />
                <p
                  className="mt-2 text-sm text-gray-500"
                  id="playerID-description"
                >
                  This should be given to you. E.g. email, code...
                </p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
              >
                Enter
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
