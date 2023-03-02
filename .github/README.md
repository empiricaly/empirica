# Empirica build process 

The Empirica CLI / libraries are built and deployed using Github Actions.

## Build versioning

The build version (e.g. v1.0.0) is based on the @empirica/core library. 
The version is changed updated by the changesets library when a "Version packages" PR is merged.


## Build the `upload-empirica-cli` action

If the `upload-empirica-cli` has been changed, the action needs to be built again:

1. Go to .github folder and install packages
`$ cd .github/actions/upload-empirica-cli`
`$ npm ci`

2. Build the action file

`$ npm run build`

3. Commit the dist folder to the repo and check Github Actions result
