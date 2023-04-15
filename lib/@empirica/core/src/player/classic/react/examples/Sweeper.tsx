import React, { useEffect } from "react";
import { usePlayer, useRound } from "../hooks";

const buttonStyle = {
  width: 40,
  height: 40,
  backgroundColor: "#888",
  color: "black",
  verticalAlign: "top",
  fontSize: "32px",
  borderLeft: "5px solid rgb(220,220,220)",
  borderTop: "5px solid rgb(220,220,220)",
  borderBottom: "5px solid #333",
  borderRight: "5px solid #333",
  display: "inline-block",
};

const visitStyle = {
  width: 40,
  height: 40,
  itemsAlign: "center",
  backgroundColor: "#555",
  color: "white",
  fontWeight: "bold",
  border: "1px solid black",
  verticalAlign: "top",
  fontSize: "24px",
  display: "inline-block",
};

type cell = number | string;
type row = [cell, cell, cell, cell, cell, cell, cell, cell, cell, cell];
type grid = [row, row, row, row, row, row, row, row, row, row];

export function Sweeper() {
  const round = useRound();
  if (!round) {
    return null;
  }
  const player = usePlayer();
  if (!player) {
    return null;
  }

  const visited = round.get("visited") as Array<Array<number>>;
  const bombs = round.get("bombs") as Array<Array<number | "X">>;
  const lost = round.get("lost") as boolean;

  useEffect(function () {
    generateBombs();
  }, []);

  function generateBombs() {
    if (bombs || !round) {
      return;
    }

    let bombArr = new Array(10)
      .fill(0)
      .map(() => new Array(10).fill(0)) as grid;

    for (let i = 0; i < bombArr.length; i++) {
      let bombPos = Math.floor(Math.random() * 10);
      bombArr[i]![bombPos] = "X";
    }

    for (let i = 0; i < bombArr.length; i++) {
      for (let j = 0; j < bombArr[i]!.length; j++) {
        if (bombArr[i]![j] !== "X") {
          let sum = 0;

          if (i > 0 && bombArr[i - 1]![j] == "X") sum++;
          if (i < bombArr.length - 1 && bombArr[i + 1]![j] == "X") sum++;
          if (j < bombArr.length - 1 && bombArr[i]![j + 1] == "X") sum++;
          if (j > 0 && bombArr[i]![j - 1] == "X") sum++;
          if (i < bombArr.length - 1 && j > 0 && bombArr[i + 1]![j - 1] == "X")
            sum++;
          if (
            i < bombArr.length - 1 &&
            j < bombArr.length - 1 &&
            bombArr[i + 1]![j + 1] == "X"
          )
            sum++;
          if (i > 0 && j > 0 && bombArr[i - 1]![j - 1] == "X") sum++;
          if (i > 0 && j < bombArr.length - 1 && bombArr[i - 1]![j + 1] == "X")
            sum++;

          bombArr[i]![j] = sum;
        }
      }
    }

    round.set("bombs", bombArr);

    let cover = Array(10)
      .fill(0)
      .map(() => Array(10).fill(0));

    round.set("visited", cover);
  }

  const visitCell = (i: number, j: number) => {
    if (lost || !bombs || !visited) {
      return;
    }

    if (bombs[i]![j] === "X") {
      round.set("lost", true);
    }

    dfsCells(i, j);
    visited[i]![j] = 1;
    round.set("visited", [...visited]);
  };

  function dfsCells(i: number, j: number) {
    if (!round || !bombs || !visited) {
      return;
    }

    if (
      i < 0 ||
      i > visited.length - 1 ||
      j < 0 ||
      j > visited[0]!.length - 1 ||
      visited[i]![j] == 1 ||
      bombs[i]![j] == "X"
    )
      return;

    visited[i]![j] = 1;

    round.set("visited", [...visited]);

    const cell = bombs[i]![j]!;
    if (typeof cell === "number" && cell < 1) {
      dfsCells(i + 1, j);
      dfsCells(i - 1, j);
      dfsCells(i, j + 1);
      dfsCells(i, j - 1);
    }
  }

  if (!bombs) {
    return null;
  }

  return (
    <div className="text-sm relative">
      {lost ? (
        <>
          <div className="absolute h-full w-full flex items-center justify-center text-6xl white font-black bg-opacity-50 bg-gray-300">
            YOU LOST
          </div>
          <div className="absolute h-full w-full flex items-center justify-center text-6xl white font-black mt-1 ml-1 text-white">
            YOU LOST
          </div>
        </>
      ) : (
        ""
      )}

      {bombs.map((arr, index) => (
        <div key={index}>
          {arr.map((_, i) => (
            <div
              key={i}
              onClick={() => visitCell(index, i)}
              style={visited[index]![i] == 0 ? buttonStyle : visitStyle}
            >
              <div className="h-full w-full flex items-center justify-center">
                {visited[index]![i] == 0
                  ? null
                  : bombs[index]![i] == 0
                  ? ""
                  : bombs[index]![i]}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
