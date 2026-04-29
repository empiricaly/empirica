# empirica v3

A simpler rebuild of Empirica.

- **Self-contained**: one Node process, one SQLite file.
- **All TypeScript**: server, client, admin, CLI, templates.
- **One npm package** (`empirica`) with subpath exports (`empirica/server`, `empirica/react`, `empirica/admin`).
- **Synchronous, transactional callbacks** on top of SQLite.
- **First-class admin UI** at `/admin`, built-in.
- **External JWT auth** for admins; HMAC-signed URL tokens for participants.

See `DESIGN.md` for the architecture overview, `TESTING.md` for the testing
conventions, and `OPEN_QUESTIONS.md` for things still being decided.

## Status

Pre-alpha. Foundation under construction. Not yet usable.

## Layout

```
v3/
├── packages/
│   ├── empirica/         # the published runtime package
│   ├── create-empirica/  # `npx create-empirica`
│   └── admin-ui/         # internal: bundled into empirica/admin
├── templates/
│   ├── default/
│   ├── minimal/
│   ├── solo/
│   └── lobby-game/
└── examples/             # optional larger examples
```

## Develop

```sh
pnpm install
pnpm test         # runs vitest across the workspace
pnpm build
```
