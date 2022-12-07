import * as uuid from "uuid";

export type Player = {
  id: string;
  age: number;
  gender: string;
};

export function createPlayer(): Player {
  return {
    id: `player-${uuid.v4()}`,
    age: 25,
    gender: "male",
  };
}
