import React from "react";
import { useRound } from "../hooks";

export function VectorGridDemo() {
  const round = useRound()!;
  const gridType = (round.get("gridType") || "vector") as "vector" | "array";

  const key = gridType == "vector" ? "grid" : "gridArray";

  function setupGrid() {
    if (round.get(key)) {
      return;
    }

    console.log("Setting up grid");

    if (gridType == "vector") {
      for (let i = 0; i < 25 * 25; i++) {
        round.append(key, 0);
      }

      return;
    }

    const grid = [];
    for (let i = 0; i < 25 * 25; i++) {
      grid.push(0);
    }

    round.set(key, grid);
  }

  function resetGrid() {
    console.log("Resetting grid");

    if (gridType == "vector") {
      const attrs = [];
      for (let i = 0; i < 25 * 25; i++) {
        attrs.push({ key: "grid", value: 0, ao: { index: i } });
      }

      round.set(attrs);

      return;
    }

    const grid = [];
    for (let i = 0; i < 25 * 25; i++) {
      grid.push(0);
    }

    round.set(key, grid);
  }

  const values = round.get(key) as number[];

  if (!values) {
    return <button onClick={setupGrid}>Setup grid</button>;
  }

  return (
    <div>
      <div className="grid grid-cols-25">
        {values.map((value, index) => (
          <div
            key={`cell-${index}`}
            className="bg-gray-200 text-center"
            style={{ width: 20, height: 20 }}
            onMouseEnter={() => {
              if (gridType == "vector") {
                round.set(key, value + 1, { index });

                return;
              }

              const grid = round.get(key) as number[];
              grid[index] = value + 1;
              round.set(key, grid);
            }}
          >
            {value}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => resetGrid()}>Reset grid</button>

        <div>Grid type: {gridType}</div>

        <button
          onClick={() =>
            round.set("gridType", gridType === "vector" ? "array" : "vector")
          }
        >
          Switch grid
        </button>
      </div>
    </div>
  );
}
