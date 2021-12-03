import { usePlayer, usePlayers, useRound } from "@empirica/player";
import React, { useEffect, useRef } from "react";
import useMouse from "@react-hook/mouse-position";
import { Avatar } from "../base/Avatar";

// task = <Sweeper />;

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

export function Sweeper(props) {
  const ref = useRef(null);
  const mouse = useMouse(ref, {
    enterDelay: 100,
    leaveDelay: 100,
  });

  const round = useRound();
  const player = usePlayer();
  const players = usePlayers().filter((p) => p.id !== player.id);

  const visited = round.get("visited");
  const bombs = round.get("bombs");
  const lost = round.get("lost");

  useEffect(function () {
    generateBombs();
  }, []);

  useEffect(
    function () {
      if (!mouse.x) {
        player.round.set("position", null);
      } else {
        player.round.set("position", [mouse.x, mouse.y]);
      }
    },
    [mouse]
  );

  function generateBombs() {
    if (bombs) {
      return;
    }

    let bombArr = Array(10)
      .fill(0)
      .map((elem) => Array(10).fill(0));

    for (let i = 0; i < bombArr.length; i++) {
      let bombPos = Math.floor(Math.random() * 10);
      bombArr[i][bombPos] = "X";
    }

    for (let i = 0; i < bombArr.length; i++) {
      for (let j = 0; j < bombArr[i].length; j++) {
        if (bombArr[i][j] !== "X") {
          let sum = 0;

          if (i > 0 && bombArr[i - 1][j] == "X") sum++;
          if (i < bombArr.length - 1 && bombArr[i + 1][j] == "X") sum++;
          if (j < bombArr.length - 1 && bombArr[i][j + 1] == "X") sum++;
          if (j > 0 && bombArr[i][j - 1] == "X") sum++;
          if (i < bombArr.length - 1 && j > 0 && bombArr[i + 1][j - 1] == "X")
            sum++;
          if (
            i < bombArr.length - 1 &&
            j < bombArr.length - 1 &&
            bombArr[i + 1][j + 1] == "X"
          )
            sum++;
          if (i > 0 && j > 0 && bombArr[i - 1][j - 1] == "X") sum++;
          if (i > 0 && j < bombArr.length - 1 && bombArr[i - 1][j + 1] == "X")
            sum++;

          bombArr[i][j] = sum;
        }
      }
    }
    round.set("bombs", bombArr);

    let cover = Array(10)
      .fill(0)
      .map((elem) => Array(10).fill(0));
    round.set("visited", cover);
  }

  const visitCell = (i, j) => {
    if (lost) {
      return;
    }

    if (bombs[i][j] == "X") {
      round.set("lost", true);
    }

    dfsCells(i, j);
    visited[i][j] = 1;
    round.set("visited", [...visited]);
  };

  function dfsCells(i, j) {
    if (
      i < 0 ||
      i > visited.length - 1 ||
      j < 0 ||
      j > visited[0].length - 1 ||
      visited[i][j] == 1 ||
      bombs[i][j] == "X"
    )
      return;

    visited[i][j] = 1;

    round.set("visited", [...visited]);
    if (bombs[i][j] < 1) {
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
    <div className="text-sm relative" ref={ref}>
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
        <div className="absolute h-full w-full text-white text-2xl pointer-events-none">
          {players.map((p) => {
            const m = p.round.get("position");
            if (!m) {
              return null;
            }

            return (
              <div
                key={p.id}
                className="absolute"
                style={{ left: m[0], top: m[1] }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 320 512"
                  className="mx-auto h-6 w-6 text-gray-900"
                  stroke="white"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M302.189 329.126H196.105l55.831 135.993c3.889 9.428-.555 19.999-9.444 23.999l-49.165 21.427c-9.165 4-19.443-.571-23.332-9.714l-53.053-129.136-86.664 89.138C18.729 472.71 0 463.554 0 447.977V18.299C0 1.899 19.921-6.096 30.277 5.443l284.412 292.542c11.472 11.179 3.007 31.141-12.5 31.141z" />
                </svg>
                <div className="absolute left-6 top-6 h-12 w-12">
                  <Avatar player={p} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {bombs.map((arr, index) => (
        <div>
          {arr.map((elem, i) => (
            <div
              onClick={() => visitCell(index, i)}
              style={visited[index][i] == 0 ? buttonStyle : visitStyle}
            >
              <div className="h-full w-full flex items-center justify-center">
                {visited[index][i] == 0
                  ? null
                  : bombs[index][i] == 0
                  ? ""
                  : bombs[index][i]}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
