# Conformance suites

The definition of done for every package (design/packages/README.md carries the
suite → package index). Tests here are written from the frozen specs BEFORE
implementation; changing a conformance test is a design change and requires a
decision-log entry (design/14-design-backlog.md).

Layout (one directory per suite, populated with the engine package spec):
determinism/ · races/ · chaos/ · flow-invariants/ · barriers/ · schema/ ·
privacy/ · resume/ · protocol/ · render/ · ledger/ · redaction/ · a11y/ ·
export/ · operator/ · e2e/
