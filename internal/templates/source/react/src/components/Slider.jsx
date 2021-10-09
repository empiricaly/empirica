import React from "react";

export function Slider({ value, onChange }) {
  return (
    <input
      className="rounded-lg overflow-hidden appearance-none bg-gray-200 h-3 w-128"
      type="range"
      min="1"
      max="100"
      step="1"
      value={value}
      onChange={onChange}
    />
  );
}
