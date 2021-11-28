import React from "react";

export function Slider({ value, onChange }) {
  const val = value || 50;
  return (
    <input
      className={`rounded-lg appearance-none bg-gray-200 h-3 w-full ${
        value === null ? "slider-thumb-zero" : "slider-thumb"
      }`}
      type="range"
      min="1"
      max="100"
      step="1"
      value={val}
      onChange={onChange}
    />
  );
}
