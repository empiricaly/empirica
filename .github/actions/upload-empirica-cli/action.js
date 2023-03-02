const path = require("path");
const semver = require("semver");

async function run(core, github, S3, fs) {
  const fileName = core.getInput("fileName", {
    required: true,
  });
  const bucket = core.getInput("bucket", {
    required: true,
  });
  const rootPath = core.getInput("root", {
    required: true,
  });
  const awsEndpoint = core.getInput("awsEndpoint", {
    required: false,
  });
  const awsSignatureVersion = core.getInput("awsSignatureVersion", {
    required: false,
  });
  const AWS_ACCESS_KEY_ID = core.getInput("AWS_ACCESS_KEY_ID", {
    required: true,
  });
  const AWS_SECRET_ACCESS_KEY = core.getInput("AWS_SECRET_ACCESS_KEY", {
    required: true,
  });
  const withVariantsStr = core.getInput("withVariants");
  const withVariants = withVariantsStr === "true";

  const s3Config = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  };

  if (awsEndpoint) {
    s3Config.endpoint = awsEndpoint;
  }

  if (awsSignatureVersion) {
    s3Config.signatureVersion = awsSignatureVersion;
  }

  const s3 = new S3(s3Config);

  const files = [
    `${fileName}-linux-amd64`,
    `${fileName}-darwin-amd64`,
    `${fileName}-darwin-arm64`,
    // `${fileName}-windows-amd64`,
  ];

  const sourceDir = path.join(process.cwd(), "out");

  const uploadParams = getUploadParams(
    sourceDir,
    bucket,
    rootPath,
    fileName,
    files
  );

  if (!uploadParams) {
    throw "missing upload params";
  }

  const uploads = [];
  for (const params of uploadParams) {
    core.info(`New Upload: ${JSON.stringify(params, undefined, 2)}`);

    params.Body = fs.createReadStream(params.Body);

    uploads.push(
      new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            core.error(err);
            reject(err);

            return;
          }

          core.info(`uploaded - ${data.Key}`);
          core.info(`located - ${data.Location}`);

          resolve(data.Location);
        });
      })
    );
  }

  if (!withVariants) {
    await Promise.all(uploads);

    return;
  }

  const attr = getBuildAttributes(
    github.context.ref,
    github.context.sha,
    github.context.eventName,
    github.context.runNumber
  );

  core.info(`Branch: ${attr.branch}`);
  core.info(`Tag: ${attr.tag}`);
  core.info(`Version: ${attr.version}`);
  core.info(`SHA: ${attr.sha}`);
  core.info(`Env: ${attr.env}`);
  core.info(`Num: ${attr.num}`);

  const variantUploads = createVariantUploads(
    sourceDir,
    files,
    bucket,
    rootPath,
    fileName,
    attr
  );

  if (!variantUploads) {
    throw "missing move params";
  }

  for (const params of variantUploads) {
    core.info(`New Upload: ${JSON.stringify(params, undefined, 2)}`);

    params.Body = fs.createReadStream(params.Body);

    uploads.push(
      new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            core.error(err);
            reject(err);

            return;
          }

          core.info(`uploaded - ${data.Key}`);
          core.info(`located - ${data.Location}`);

          resolve(data.Location);
        });
      })
    );
  }

  await Promise.all(uploads);

  // const variantUploads = createVariantCopies(
  //   files,
  //   bucket,
  //   rootPath,
  //   fileName,
  //   attr
  // );

  // const variations = [];

  // for (const params of variantUploads) {
  // variations.push(
  //   new Promise((resolve) => {
  //     core.info(`New Copy: ${JSON.stringify(params, undefined, 2)}`);

  //     s3.copyObject(params, (err, data) => {
  //       if (err) core.error(err);
  //       core.info(`copied - ${params.CopySource} to ${params.Key}`);
  //       resolve(null);
  //     });
  //   })
  // );
  // }

  // await Promise.all(variations);
}


function getBuildAttributes(gitRef, gitSHA, githubEvent, githubRun) {
  let tag = process.env.BUILD_TAG;
  let branch = process.env.BUILD_BRANCH || "unknown";
  let version = "unknown";

  if (semver.valid(tag)) {
    version = tag;
  }

  const sha = gitSHA.substring(0, 7);
  const env = version !== "unknown" ? "prod" : branch === "main" ? "dev" : "";
  const num = githubRun;

  return {
    branch,
    tag,
    version,
    sha,
    env,
    num,
  };
}

function getUploadParams(sourceDir, bucket, rootPath, fileName, files) {
  const uploads = [];

  for (const file of files) {
    const parts = file.split("-");
    const os = parts[1];
    const platform = parts[2];
    const ext = os === "windows" ? ".exe" : "";
    const mime =
      os === "windows"
        ? "application/vnd.microsoft.portable-executable"
        : "application/x-executable";
    const bucketPath = `${rootPath}/${os}/${platform}/latest/${fileName}${ext}`;

    const p = path.join(sourceDir, file);

    uploads.push({
      Bucket: bucket,
      Key: bucketPath,
      ContentType: mime,
      Body: p,
    });
  }

  return uploads;
}

function createVariantCopies(files, bucket, rootPath, fileName, attr) {
  const variations = [];
  const variants = [
    {
      prefix: "build",
      suffix: attr.num.toString(),
    },
    {
      prefix: "sha",
      suffix: attr.sha,
    },
  ];

  if (attr.branch !== "unknown" && attr.branch !== "not_found") {
    variants.push({ prefix: "branch", suffix: attr.branch });
  }

  if (attr.tag !== "unknown") {
    variants.push({ prefix: "tag", suffix: attr.tag });
  }

  if (attr.version !== "unknown") {
    variants.push({ prefix: "version", suffix: attr.version });
  }

  switch (attr.env) {
    case "dev":
      variants.push({ prefix: "dev", suffix: "" });
      break;
    case "prod":
      variants.push({ prefix: "prod", suffix: "" });
      break;
  }

  for (const file of files) {
    for (const variant of variants) {
      const parts = file.split("-");
      const os = parts[1];
      const platform = parts[2];
      const ext = os === "windows" ? ".exe" : "";
      const fromPath = `/${bucket}/${rootPath}/${os}/${platform}/latest/${fileName}${ext}`;
      let toPath = `${rootPath}/${os}/${platform}/${variant.prefix}`;

      if (variant.suffix) {
        toPath += `/${variant.suffix}`;
      }

      toPath = `${toPath}/${fileName}`;

      toPath += ext;

      const params = {
        Bucket: bucket,
        Key: toPath,
        CopySource: fromPath,
      };

      variations.push(params);
    }
  }

  return variations;
}

function createVariantUploads(
  sourceDir,
  files,
  bucket,
  rootPath,
  fileName,
  attr
) {
  const variations = [];
  const variants = [
    {
      prefix: "build",
      suffix: attr.num.toString(),
    },
    {
      prefix: "sha",
      suffix: attr.sha,
    },
  ];

  if (attr.branch !== "unknown" && attr.branch !== "not_found") {
    variants.push({ prefix: "branch", suffix: attr.branch });
  }

  if (attr.tag !== "unknown") {
    variants.push({ prefix: "tag", suffix: attr.tag });
  }

  if (attr.version !== "unknown") {
    variants.push({ prefix: "version", suffix: attr.version });
  }

  switch (attr.env) {
    case "dev":
      variants.push({ prefix: "dev", suffix: "" });
      break;
    case "prod":
      variants.push({ prefix: "prod", suffix: "" });
      break;
  }

  for (const file of files) {
    for (const variant of variants) {
      const parts = file.split("-");
      const os = parts[1];
      const platform = parts[2];
      const ext = os === "windows" ? ".exe" : "";
      const mime =
        os === "windows"
          ? "application/vnd.microsoft.portable-executable"
          : "application/x-executable";

      let bucketPath = `${rootPath}/${os}/${platform}/${variant.prefix}`;

      if (variant.suffix) {
        bucketPath += `/${variant.suffix}`;
      }

      bucketPath = `${bucketPath}/${fileName}`;
      bucketPath += ext;

      const p = path.join(sourceDir, file);

      const params = {
        Bucket: bucket,
        Key: bucketPath,
        ContentType: mime,
        Body: p,
      };

      variations.push(params);
    }
  }

  return variations;
}

module.exports = {
  run,
  getUploadParams,
  getBuildAttributes,
  createVariantUploads,
  createVariantCopies,
};
