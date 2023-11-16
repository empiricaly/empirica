# Introduction

Thank you for considering contributing to Empirica. It's people like you that
make Empirica such a great tool.

Following these guidelines helps to communicate that you respect the time of the
developers managing and developing this open source project. In return, they
should reciprocate that respect in addressing your issue, assessing changes, and
helping you finalize your pull requests.

All members of our community are expected to follow our Code of Conduct. Please
make sure you are welcoming and friendly in all of our spaces.

Empirica is an open source project and we love to receive contributions from our
community — you! There are many ways to contribute, from writing tutorials or
blog posts, improving the documentation, submitting bug reports and feature
requests or writing code which can be incorporated into Empirica itself.

Please, don't use the issue tracker for support questions. Check whether the
#tech-support [Slack
channel](https://join.slack.com/t/empirica-ly/shared_invite/zt-1fb34yq47-YlgYUJmXJAdv7QmHsa_fdw)
can help with your issue.

If you wish to contribute things other than code (blog post, docs...), please
get in touch with us on
[Slack](https://join.slack.com/t/empirica-ly/shared_invite/zt-1fb34yq47-YlgYUJmXJAdv7QmHsa_fdw)
in the #contributing channel. We are happy to help you get started.

# Ground Rules

Responsibilities

- Create issues for any major changes and enhancements that you wish to make.
  Discuss things transparently and get community feedback.
- Keep feature versions as small as possible, preferably one new feature per
  version.
- Be welcoming to newcomers and encourage diverse new contributors from all
  backgrounds. See the [Code of Conduct](./CODE_OF_CONDUCT.md).

# Your First Contribution

Unsure where to begin contributing to Empirica? You can start by looking through
these beginner and help-wanted issues:

- Beginner issues - issues which should only require a few lines of code, and a
  test or two.
- Help wanted issues - issues which should be a bit more involved than beginner
  issues.

While not perfect, number of comments is a reasonable proxy for impact a given
change will have.

Working on your first Pull Request? You can learn how from these resources: [How
to Contribute to an Open Source Project on
GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github),
http://makeapullrequest.com/, or http://www.firsttimersonly.com/

# Getting started

For bug fixes, documentation typos, and small features:

1.  Create your own fork of the code
2.  Do the changes in your fork
3.  If you like the change and think the project could use it:

    - Be sure you have followed the code style for the project.
    - Note the Code of Conduct.
    - Send a pull request.

For new features that change the public API, are large, or are likely to be
controversial:

1. Start by opening a new issue describing the feature. This lets the
   maintainers and the community know what's coming, and gives them the
   chance to weigh in before you spend time on something that may not
   get accepted.
2. Follow the same process as for bug fixes and small features.

# How to report a bug

Any security issues should be submitted directly to hello@empirica.ly.
In order to determine whether you are dealing with a security issue, ask
yourself these two questions:

- Can I access something that's not mine, or something I shouldn't have access
  to?
- Can I disable something for other people?

If the answer to either of those two questions are "yes", then you're probably
dealing with a security issue. Note that even if you answer "no" to both
questions, you may still be dealing with a security issue, so if you're unsure,
just email us at hello@empirica.ly.

When filing an issue, make sure to answer these five questions:

1. What version of Empirica (`empirica version`) and which browser are you
   using?
2. What operating system and processor architecture are you using?
3. What did you do?
4. What did you expect to see?
5. What did you see instead?

General questions should go to the #tech-support [Slack
channel](https://join.slack.com/t/empirica-ly/shared_invite/zt-1fb34yq47-YlgYUJmXJAdv7QmHsa_fdw)
instead of the issue tracker. The community members there will answer or ask you to
file an issue if you've tripped over a bug.

# How to suggest a feature or enhancement

If you find yourself wishing for a feature that doesn't exist in Empirica, you
are probably not alone. There are bound to be others out there with similar
needs. Many of the features that Empirica has today have been added because our
users saw the need. Open an issue on our issues list on GitHub which describes
the feature you would like to see, why you need it, and how it should work.

# Code review process

The core team looks at Pull Requests on a regular basis.
After feedback has been given we expect responses within two weeks. After two
weeks we may close the pull request if it isn't showing any activity.

# Community

[Join us on Slack](https://join.slack.com/t/empirica-ly/shared_invite/zt-1fb34yq47-YlgYUJmXJAdv7QmHsa_fdw).

# Code and commit message conventions

For Go code, we use golint-ci, which should be run on all code before submitting
a PR. Anything that is not a public API should be added in the `internal`
folder. You can see the version of Go used in the `go.mod` file.

For TypeScript and JavaScript code, we use prettier, which should be run
on all code before submitting a PR. We use `npm` for package management. Each
`package.json` contains the versions of `node` and `npm`, locked with
[Volta](https://volta.sh/), which we recommend using. Make sure to separate your
code into the correct scope (client/server and core/classic).

We generally prefer using [Conventional
Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages, as
it makes it easier to understand what a commit does. The commit messages are not
used to generate changelogs, so it's not a big deal if you don't use them.

We use [Changesets](https://github.com/changesets/changesets) to generate
changelogs and versionning. When you submit a PR, you should add a changeset
file to the `changesets` folder. You can use the `npx changeset` command to
generate a new changeset file. See the [Changesets
documentation](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
for more details.
