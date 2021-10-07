# Empirica v2

Empirica v2 is currently in alpha and ready for early testing. We do not
recommend building experiments that need to release in the near future on
Empirica v2 yet. We also recommend only developers with experience with v1 to
venture into v2 world.

# Requirements

The current requirements for v2 are:

- macos (working on builds for Windows and Linux)
- Node.js (https://nodejs.org/en/download/)
- Yarn 1 (https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable, we will
  move to v2 before .0 release)

We are working to lower requirements.

# Installation

Download the empirica binary from: https://github.com/empiricaly/empirica/releases/download/v2-pre-alpha/empirica

Place it in `/usr/local/bin`. Run:

```sh
chmod +x /usr/local/bin/empirica
```

To update, do the same process.

# Getting started

```
empirica create my-project
cd my-project
empirica
```

The server will have started and go to http://localhost:8844 to get started. Go
to http://localhost:8844/admin to access the admin, the credentials are in
`.empirica/empirica.toml`.
