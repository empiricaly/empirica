import React, { useRef } from "react";

export function Slider({
  value,
  onChange = null,
  min = 0,
  max = 100,
  stepSize = 1,
  disabled = false,
}) {
  const val = value === null ? (max - min) / 2 : value;
  const cls = value === null ? "slider-thumb-zero" : "slider-thumb";
  const ref = useRef(null);

  if (value !== null && ref.current) {
    const nmin = min ? min : 0;
    const nmax = max ? max : 100;
    const newVal = Number(((value - nmin) * 100) / (nmax - nmin));

    ref.current.style.left = `calc(${newVal}% + (${8 - newVal * 0.15}px))`;
  }

  return (
    <div className="relative w-full">
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
      {value === null ? (
        ""
      ) : (
        <output
          ref={ref}
          className="font-mono absolute w-12 h-7 flex items-center justify-center left-1/2 bottom-7 rounded transform -translate-x-1/2 bg-gray-200"
        >
          {value}
        </output>
      )}
    </div>
  );
}
