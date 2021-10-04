import React from "react";

const base =
  "inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500";
const prim =
  "border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50";
const sec =
  "border-transparent shadow-sm text-white bg-empirica-600 hover:bg-empirica-700";

export function Button({
  children,
  handleClick,
  className = "",
  primary = false,
}) {
  let cn = `${base} ${primary ? prim : sec} ${className}`;

  return (
    <button onClick={handleClick} type="button" className={cn}>
      {children}
    </button>
  );
}
