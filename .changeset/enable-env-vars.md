---
"@empirica/core": patch
---

Added support for environment variables for configuring Empirica. For example,
you can now set the `tajriba.store.file` config option with the
`EMPIRICA_TAJRIBA_AUTH_USERNAME` environment variable instead of using the
`--tajriba.store.file` command line option.

Any command line or empirica file options can be set with environment variables
by replacing the `.` with `_`, uppercasing the name, and prefixing it with
`EMPIRICA_`. Examples:

- `--log.level` becomes `EMPIRICA_LOG_LEVEL`
- `--server.addr` becomes `EMPIRICA_SERVER_ADDR`
- `--production` becomes `EMPIRICA_PRODUCTION`
