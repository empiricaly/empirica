import React from "react";

export function Slider({ value, onChange }) {
  const val = value || 50;
  const cls = value === null ? "slider-thumb-zero" : "slider-thumb";
  return (
    <input
      className={`rounded-lg appearance-none bg-gray-200 h-3 w-full ${cls}`}
      type="range"
      min="0"
      max="100"
      step="1"
      value={val}
      onChange={onChange}
    />
  );
}
