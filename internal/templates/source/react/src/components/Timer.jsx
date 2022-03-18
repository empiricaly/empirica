import { useStageTimer } from "@empirica/player";
import React from "react";

export function Timer() {
  let remaining = useStageTimer();

  return (
    <div className="flex flex-col items-center">
      <h1 className="font-mono text-3xl text-gray-500 font-semibold">
        {humanTimer(remaining)}
      </h1>
    </div>
  );
}

function humanTimer(seconds) {
  if (seconds === null) {
    return "-";
  }

  let out = "";
  const s = seconds % 60;
  out += s < 10 ? "0" + s : s;

  const min = (seconds - s) / 60;
  if (min === 0) {
    return `00:${out}`;
  }

  const m = min % 60;
  out = `${m < 10 ? "0" + m : m}:${out}`;

  const h = (min - m) / 60;
  if (h === 0) {
    return out;
  }

  return `${h}:${out}`;
}
