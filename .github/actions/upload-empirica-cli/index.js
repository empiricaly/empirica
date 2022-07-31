const core = require("@actions/core");
const github = require("@actions/github");
const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");
const action = require("./action.js");

action.run(core, github, S3, fs).catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});
