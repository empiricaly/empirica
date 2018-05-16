# Introduction

Thank you for considering contributing to Empirica. We are grateful for any help
you are willing to contribute, even minor.

Keep an open mind! Improving documentation, bug triaging, or writing tutorials
are all examples of helpful contributions that mean less work for you.

Following these guidelines helps to communicate that you respect the time of the
developers managing and developing this open source project. In return, they
should reciprocate that respect in addressing your issue, assessing changes, and
helping you finalize your pull requests.

In the root repository (https://github.com/empiricaly/empirica), we are looking
for changes to the core of Empirica. For any changes to experiements, please
check out the various experiements' respective repositories.

<!-- ### Explain contributions you are NOT looking for (if any).

Again, defining this up front means less work for you. If someone ignores your guide and submits something you don’t want, you can simply close it and point to your policy.

> Please, don't use the issue tracker for [support questions]. Check whether the #pocoo IRC channel on Freenode can help with your issue. If your problem is not strictly Werkzeug or Flask specific, #python is generally more active. Stack Overflow is also worth considering. -->

# Ground Rules

All members of our community are expected to follow our
[Code of Conduct](code_of_conduct). Please make sure you are welcoming and
friendly in all of our spaces.

## Responsibilities

* Your code was formatted by [Prettier](https://prettier.io/). All code MUST be formatted using Prettier.
* Ensure cross-platform compatibility for every change that's accepted. Windows, Mac, Linux (at least for development).
* Create issues for any major changes and enhancements that you wish to make. Discuss things transparently andd get community feedback.
* Keep feature versions as small as possible, preferably one new feature per version.
* Be welcoming to newcomers and encourage diverse new contributors from all backgrounds (See code of conduct above).
* Ensure that code goes through the following checklist:
  * Is this change useful to me, or something that I think will benefit others greatly?
  * Check for overlap with other PRs.
  * Think carefully about the long-term implications of the change. How will it affect existing projects that are dependent on this? How will it affect my projects? If this is complicated, do I really want to maintain it forever? Is there any way it could be implemented as a separate package, for better modularity and flexibility?
  * If it does too much, ask for it to be broken up into smaller PRs.
  * Is it consistent?
  * Review the changes carefully, line by line. Make sure you understand every single part of every line. Learn whatever you do not know yet.
  * Take the time to get things right. PRs almost always require additional improvements to meet the bar for quality. Be very strict about quality. This usually takes several commits on top of the original PR.

# Your First Contribution

Unsure where to begin contributing to Empririca? You can start by looking
through these beginner and help-wanted issues (there might not be any issues
marked with the following tags at all point in time):

* Beginner issues - issues which should only require a few lines of code, and a
  test or two.
* Help wanted issues - issues which should be a bit more involved than beginner
  issues.

Working on your first Pull Request? Here are a couple of friendly tutorials on
how to make your first contribution: http://makeapullrequest.com/ and
http://www.firsttimersonly.com/. You can also learn how from this _free_ series,
[How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

# Getting started

For something that is bigger than a one or two line fix:

1.  Create your own fork of the code
2.  Do the changes in your fork
3.  If you like the change and think the project could use it:

    * Be sure you have followed the code style for the project.
    * Sign the Contributor License Agreement, CLA, with the jQuery Foundation.
    * Note the jQuery Foundation Code of Conduct.
    * Send a pull request indicating that you have a CLA on file.

Small contributions such as fixing spelling errors, where the content is small enough to not be considered intellectual property, can be submitted by a contributor as a patch, without a CLA.

As a rule of thumb, changes are obvious fixes if they do not introduce any new functionality or creative thinking. As long as the change does not affect functionality, some likely examples include the following:

* Spelling / grammar fixes
* Typo correction, white space and formatting changes
* Comment clean up

# How to report a bug

## Security issue

If you find a security vulnerability, do NOT open an issue. Email
hello@empirica.ly instead.

If you don’t want to use your personal contact information, set up a “security@”
email address. Larger projects might have more formal processes for disclosing
security, including encrypted communication. (Disclosure: I am not a security
expert.)

In order to determine whether you are dealing with a security issue, ask yourself these two questions:

* Can I access something that's not mine, or something I shouldn't have access to?
* Can I disable something for other people?

If the answer to either of those two questions are "yes", then you're probably
dealing with a security issue. Note that even if you answer "no" to both
questions, you may still be dealing with a security issue, so if you're unsure,
just email us at hello@empirica.ly.

## General issue

When filing an issue, make sure to answer these five questions:

1.  What version of Empirica are you using? (Which tag or commit did fork Empirica from)
2.  What operating system and processor architecture are you using?
3.  What did you do?
4.  What did you expect to see?
5.  What did you see instead?

## How to suggest a feature or enhancement

The Empirica philosophy is to provide small, robust framework for running
multiplayer interactive experiments and games in the browser. It was created to
make it easy to develop and iterate on sophisticated designs in a statistically
sound manner, and offers a unique combination of power, flexibility, and speed.

The core of Empirica should offer a powerful feature set, without making the
development of new experiments a hassle for the expeirment designer. It's
important we hide the complexities of Empririca's core and keep a clean, simple
and predicatable API for the experiment deveopers.

If you find yourself wishing for a feature that doesn't exist in Empririca, you
are probably not alone. There are bound to be others out there with similar
needs. Many of the features that Empririca has today have been added because our
users saw the need. Open an issue on our issues list on GitHub which describes
the feature you would like to see, why you need it, and how it should work. Make
sure your idea is not already formulated (even slightly differently) in another
issue before creating a new one.

# Code review process

The core team looks at Pull Requests on a regular basis. After feedback has been
given we expect responses within two weeks. After two weeks we may close the
pull request if it isn't showing any activity.

<!-- # Community

// It would be nice to add Gitter or Slack for talking to the community. But at
// the same time that is quite demanding time-wise, so gotta make sure we have
// the time.

> You can chat with the core team on https://gitter.im/cucumber/cucumber. We try to have office hours on Fridays.

[source: [cucumber-ruby](https://github.com/cucumber/cucumber-ruby/blob/master/CONTRIBUTING.md#talking-with-other-devs)] **Need more inspiration?**
[1][chef](https://github.com/chef/chef/blob/master/CONTRIBUTING.md#-developer-office-hours) [2][cookiecutter](https://github.com/audreyr/cookiecutter#community) -->

[code_of_conduct]: https://raw.githubusercontent.com/empiricaly/empirica/master/CODE_OF_CONDUCT.md
