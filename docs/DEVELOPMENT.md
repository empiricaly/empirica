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