# How to use Empirica in development mode

This guide provides explanation on how to run the Empirica libraries during the development of Empirica itself.


## Running Empirica Core in development mode

**Prerequisites:**

Node.js, yarn, go and modd installed


1. Clone empirica from the repo

`$ git clone git@github.com:empiricaly/empirica.git`

2. Link the core library into the system using npm link

`$ cd empirica/lib/@empirica/core`
`$ npm link`

3. Create an experiment using Empirica CLI

`$ empirica create <experiment-name>`

4. Link the core library to the client project

`$ cd <experiment-name>/client`
`$ npm link @empirica/core`

5. Link the core library to the server project

`$ cd <experiment-name>/server`
`$ npm link @empirica/core`

6. Run the rebuild watcher (modd) in order to rebuild once the library code has been changed

`$ cd empirica/lib/@empirica/core`
`$ modd`

7. Run the experiment

`$ cd <experiment-name>`
`$ empirica`

8. Navigate to `localhost:3000`


## Running the Admin UI in development mode

Check the guide in the [admin UI folder](../lib/admin-ui/README.md)


## Templates for creating experiments

New experiments created by `empirica create` are seeded with templates for `client` and `server` directories. To make updates, navigate to the templates source folder from the root of the Empirica project via

```sh
cd internal/templates/source
```

### Handling client and server template updates

Changes made to the `react` directory will be reflected in `client` directories of newly created projects. Changes made to the `callbacks` directory will be reflected in `server` directories of newly created projects.

If any of these changes affect the `package.json` file within either of `react` or `callbacks`, be sure the `package-lock.json` file is updated via running `empirica npm install` within that folder. For example, if you install a new package that is added to `react/package.json`, run `empirica npm install` from within `react/package.json`.

### Testing updated templates

Make sure Go is installed on your machine and accessible to your workspace, then install `go-bindata` via `brew install go-bindata` if using Homebrew on MacOS. Alternatively, you can use `go get -u github.com/go-bindata/go-bindata/...` to install the library and command-line tool in the `empirica` project.

Then, from the root of the project, run

```sh
go generate ./internal/templates/...
go build -o empirica ./cmds/empirica
```

This will produce the `empirica` binary, and can be used via `./empirica create` to seed a test experiment to validate your template changes.
