# empirica

Real-time multi-player behavioral experiments. Self-contained, SQLite-backed,
all TypeScript.

> Pre-alpha. APIs unstable.

```sh
npm install empirica
```

## Subpath exports

| Import                | Use in                        |
|-----------------------|-------------------------------|
| `empirica`            | Shared types                  |
| `empirica/server`     | Server callbacks, runtime     |
| `empirica/client`     | Vanilla browser SDK           |
| `empirica/react`      | React hooks + components      |
| `empirica/testing`    | Helpers for testing your callbacks |

See the [v3 README](https://github.com/empiricaly/empirica/tree/main/v3) for
project status and design.
