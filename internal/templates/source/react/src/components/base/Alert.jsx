import React from "react";

export function Alert({ children, title, kind = "normal" }) {
  let bg, icn, ttl, chld;
  switch (kind) {
    case "warn":
      bg = "bg-yellow-50";
      icn = "text-yellow-400";
      ttl = "text-yellow-800";
      chld = "text-yellow-700";
    case "error":
      bg = "bg-red-50";
      icn = "text-red-400";
      ttl = "text-red-800";
      chld = "text-red-700";
    case "success":
      bg = "bg-green-50";
      icn = "text-green-400";
      ttl = "text-green-800";
      chld = "text-green-700";
    default:
      bg = "bg-empirica-50";
      icn = "text-empirica-400";
      ttl = "text-empirica-800";
      chld = "text-empirica-700";
  }

  return (
    <div className={`rounded-md p-4 ${bg}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${icn}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${ttl}`}>{title}</h3>
          <div className={`mt-2 text-sm text-yellow-700 ${chld}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
