---
"@empirica/core": minor
---

`empirica export` could fail with a "Premature close" error (#474). This seems
to be originating from a bug in the `node-fetch` package, which is used to
polyfill `fetch` in Node.js. This upgrades Node.js to v20+, which includes
native `fetch` support. We still have the `cross-fetch` polyfill for projects
that have not updated to Node.js v20+ yet. Export uses a vendored project which
has been updated to use the latest Node.js version, so it does not require the
entire experiment to be updated for it to use Node.js v20+.

See the following issues on `node-fetch` for more details:
https://github.com/node-fetch/node-fetch/issues/1767
https://github.com/node-fetch/node-fetch/issues/1576
