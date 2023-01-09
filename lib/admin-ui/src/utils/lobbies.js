import { ORIGIN } from "../constants.js";
import { durationString } from "./time.js";

export async function getLobbies() {
  return (await fetch(ORIGIN + "/lobbies")).json();
}

export function formatLobby(lobby) {
  let name = "";

  if (lobby.name) {
    name = lobby.name + " - ";
  }

  if (lobby.kind === "shared") {
    return `${name}Shared / ${durationString(lobby.duration)} / ${
      lobby.strategy
    }`;
  }

  return `${name}Individual / ${durationString(lobby.duration)} / ${
    lobby.extensions || 0
  }`;
}
