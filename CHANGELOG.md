# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* Indexes on all fields used in queries.

### Changed

* Exit Step components now require a unique static property named `stepName` to
  be defined. This is used by Empirica Core to register steps as done. E.g.

  ```jsx
  export default class Thanks extends React.Component {
    static stepName = "Thanks";
    render() {
      return (
        <div className="thanks">
          <h3>Thanks!</h3>
        </div>
      );
    }
  }
  ```

### Fixed

* Reset DB settings were not honored in a "production" deployment.
* Exit Steps now work in production build. See new Exit Step requirements in
  Changed section above.

<!-- Add unreleased changes here -->

## 0.1.0 - 2018-05-16

### Added

* Initial Beta release.

[unreleased]: https://github.com/empiricaly/empirica/compare/v0.1.0...HEAD

<!--

How to add a link to the code for each version.

First make sure to put the version number in brackets (here, 1.2.3):

## [1.2.3] - 2020-01-20

### Added

* Amazing stuff

// Then at the end of the document add a link to the compare:

[1.2.3]: https://github.com/empiricaly/empirica/compare/v1.2.2...v1.2.3

 -->
