import React from "react";

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  stepSize = 1,
  disabled = false,
}) {
  const val = value === null ? 50 : value;
  const cls = value === null ? "slider-thumb-zero" : "slider-thumb";

  return (
    <input
      className={`rounded-lg appearance-none bg-gray-200 h-3 w-full ${cls}`}
      type="range"
      min={min}
      max={max}
      step={stepSize}
      value={val}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
