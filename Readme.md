# Empirica v2

Empirica v2 is currently in beta and ready for testing. We do not recommend
building new experiments with v2 that need to run before June 2022.
We will be supporting Empirica v1 until December 2022.

# Requirements

The current requirements for v2 are:

- macOS (working on builds for Windows and Linux)
- Node.js (https://nodejs.org/en/download/)

We are working to lower requirements.

# Installation

Run the installation script:

```sh
curl https://get.empirica.dev | sh
```

To update, run the command again.

# Getting started

```
empirica create my-project
cd my-project
empirica
```

The server will have started, and go to http://localhost:3000 to get started. Go
to http://localhost:3000/admin to access the admin, the credentials are in
`.empirica/empirica.toml`.
