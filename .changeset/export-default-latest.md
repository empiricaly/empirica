---
"@empirica/core": patch
---

Use `@empirica/core@latest` for `empirica export` if the version is not found.
We used to `npm link` to the local version, assuming we were in development
mode. To use the locally linked version, use `export EMPIRICA_DEV=1`.
