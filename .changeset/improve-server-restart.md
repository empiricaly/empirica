---
"@empirica/core": patch
---

Improve server restart mechanics. The server will only try to restart
automatically 3 times, and then it will stop. This is to prevent the server from
getting stuck in a restart loop. It will only do this if the restart is
happening less than 5 seconds after the previous restart.

We have also improved the error management for new projects. See
`internal/templates/source/callbacks/package.json` and
`internal/templates/source/callbacks/src/index.js` if you want to replicate the
changes in your already created project.
