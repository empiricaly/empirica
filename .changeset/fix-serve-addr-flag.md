---
"@empirica/core": patch
---

The `serve` command would ignore the `--addr` flag to specify the address to
listen on. This is now fixed. Thanks to @malsobay for the report. Fixes #315.
