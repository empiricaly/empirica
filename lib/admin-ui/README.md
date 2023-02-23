# Empirica Admin UI

## Running in development mode

1. Create an experiment using Empirica CLI

`$ empirica create <experiment-name>`

2. Run the experiment

`$ cd exp123`
`$ empirica`

3. Run the dev server for the admin UI:

`$ cd empirica/lib/admin-ui`
`$ npm run dev`

4. Navigate to `localhost:3001`

Note: the requests will be proxied to `localhost:3000` (default port for Empirica)