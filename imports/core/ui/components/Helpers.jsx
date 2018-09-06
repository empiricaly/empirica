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

export const withStaticProps = (WrappedComponent, props) => {
  return class extends React.Component {
    render() {
      return <WrappedComponent {...props} {...this.props} />;
    }
  };
};
