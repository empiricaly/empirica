const test = require("ava");
const action = require("./action");

test("createVariantUploads", (t) => {
  const fileName = "xyz";
  const files = [`${fileName}-linux-amd64`];

  const cases = [
    {
      out: [
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/build/1/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/sha/ffac537/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/branch/mybranch/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
      ],
      in: {
        branch: "mybranch",
        tag: "unknown",
        version: "unknown",
        sha: "ffac537",
        env: "",
        num: "1",
      },
    },
    {
      out: [
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/build/2/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/sha/ffac537/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/branch/hello/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
      ],
      in: {
        branch: "hello",
        tag: "unknown",
        version: "unknown",
        sha: "ffac537",
        env: "",
        num: "2",
      },
    },
    {
      out: [
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/build/3/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/sha/ffac537/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/tag/v1.2.3/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/version/v1.2.3/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/prod/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
      ],
      in: {
        branch: "unknown",
        tag: "v1.2.3",
        version: "v1.2.3",
        sha: "ffac537",
        env: "prod",
        num: "3",
      },
    },
    {
      out: [
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/build/4/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/sha/ffac537/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/branch/main/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
        {
          Bucket: "bucket",
          Key: "rootPath/linux/amd64/dev/xyz",
          ACL: "public-read",
          CopySource: "/bucket/rootPath/linux/amd64/latest/xyz",
        },
      ],
      in: {
        branch: "main",
        tag: "unknown",
        version: "unknown",
        sha: "ffac537",
        env: "dev",
        num: "4",
      },
    },
  ];

  for (const kase of cases) {
    const out = action.createVariantUploads(
      files,
      "bucket",
      "rootPath",
      fileName,
      kase.in
    );

    t.deepEqual(kase.out, out);
  }
});

test("getUploadParams", (t) => {
  const fileName = "xyz";
  const files = [
    `${fileName}-linux-amd64`,
    `${fileName}-darwin-amd64`,
    `${fileName}-darwin-arm64`,
  ];

  const res = action.getUploadParams(
    "mysrcdir/hey",
    "abc",
    "root",
    "myfile",
    files
  );

  t.deepEqual(
    [
      {
        Bucket: "abc",
        ACL: "public-read",
        Key: "root/linux/amd64/latest/myfile",
        ContentType: "application/x-executable",
        Body: "mysrcdir/hey/xyz-linux-amd64",
      },
      {
        Bucket: "abc",
        ACL: "public-read",
        Key: "root/darwin/amd64/latest/myfile",
        ContentType: "application/x-executable",
        Body: "mysrcdir/hey/xyz-darwin-amd64",
      },
      {
        Bucket: "abc",
        ACL: "public-read",
        Key: "root/darwin/arm64/latest/myfile",
        ContentType: "application/x-executable",
        Body: "mysrcdir/hey/xyz-darwin-arm64",
      },
    ],
    res
  );
});

test("getRunAttributes", (t) => {
  const cases = [
    {
      in: {
        gitRef: "refs/heads/mybranch",
        gitSHA: "ffac537e6cbbf934b08745a378932722df287a53",
        githubEvent: "push",
        githubRun: "1",
      },
      out: {
        branch: "mybranch",
        tag: "unknown",
        version: "unknown",
        sha: "ffac537",
        env: "",
        num: "1",
      },
    },
    {
      in: {
        gitRef: "refs/pull/123/merge",
        gitSHA: "ffac537e6cbbf934b08745a378932722df287a53",
        githubEvent: "pull_request",
        githubRun: "2",
      },
      env: {
        GITHUB_HEAD_REF: "hello",
      },
      out: {
        branch: "hello",
        tag: "unknown",
        version: "unknown",
        sha: "ffac537",
        env: "",
        num: "2",
      },
    },
    {
      in: {
        gitRef: "refs/tags/v1.2.3",
        gitSHA: "ffac537e6cbbf934b08745a378932722df287a53",
        githubEvent: "create",
        githubRun: "3",
      },
      out: {
        branch: "unknown",
        tag: "v1.2.3",
        version: "v1.2.3",
        sha: "ffac537",
        env: "prod",
        num: "3",
      },
    },
    {
      in: {
        gitRef: "refs/heads/main",
        gitSHA: "ffac537e6cbbf934b08745a378932722df287a53",
        githubEvent: "push",
        githubRun: "4",
      },
      out: {
        branch: "main",
        tag: "unknown",
        version: "unknown",
        sha: "ffac537",
        env: "dev",
        num: "4",
      },
    },
  ];

  for (const kase of cases) {
    const { gitRef, gitSHA, githubEvent, githubRun } = kase.in;
    const beforeEnv = {};
    if (kase.env) {
      for (const key in kase.env) {
        beforeEnv[key] = process.env[key];
        process.env[key] = kase.env[key];
      }
    }
    const res = action.getAttributes(gitRef, gitSHA, githubEvent, githubRun);
    t.deepEqual(kase.out, res);
    if (kase.env) {
      for (const key in beforeEnv) {
        process.env[key] = kase.env[key];
      }
    }
  }
});
