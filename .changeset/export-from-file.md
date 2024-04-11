---
"@empirica/core": minor
---

Export now supports passing a tajriba.json file as the first argument to export
the data directly from a file instead of automatically detecting the file from
the current project.

```sh
# At the root of the project.
empirica export

# Anywhere, although it uses the global version of empirica (not the version
# locked in your project). Upgrade to the latest version of empirica with:
# `empirica upgrade --global`
empirica export path/to/tajriba.json
```
