import React from "react";

export const DevNote = ({ children, block = false }) =>
  block ? (
    <p className="devnote">
      <strong>DevNote</strong> {children}
    </p>
  ) : (
    <span className="devnote">
      <strong>DevNote</strong> {children}
    </span>
  );

export const CoreWrapper = ({ children }) => (
  <div className="core">{children}</div>
);
