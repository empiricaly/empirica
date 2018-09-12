# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to
[Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Indexes on all fields used in queries.
- Treatment conditions and exit steps data added to export.
- `onGameEnd(game, players)` is added in the `callback` and will run before the
  Exit Survey.
- CSV Export includes the extracted Player's ID from the URL parameter (i.e., `playerIdParam` settings).
- New onGameStart, onStageStart callbacks.
- Simple page titles to help distinguish tabs.
- New `append()` method on players, playerRounds, playerStages, games, stages and rounds.
- Added `set()` to games, rounds and stages, and `get()` to games.
- Added `onSet()`, `onAppend()` and `onChange()` callbacks.
- Added `get()` are `set()` now available on `player` introduction steps. #71
- Retiring players who did not play to allow them to play again. #70

### Changed

- Exit Step components now require a unique static property named `stepName` to
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

- The Background job library was replaced byt simple custom background task
  runner. Currently the task runner will run in each process, and will not work
  well in a multi-server deployment.

  A lock needs to be added so the worker loops will only run on one server per
  deployment.

  This changes was motivated by the need for Empirica to run tasks every 1s, and
  at that frequency, the previous system we used was spending much of that
  second talking to DB for a lock before each task, and an execution report
  after each task.

  Now that latency is completely removed, and we will eventually lock once at
  startup to support a multi-server setup, with the downside that all background
  jobs will run a on single machine. We think it's a reasonable downside given
  our requirements.

  Also, for most deployments we can foresee, horizontal scaling will not be used
  much.

- At game start, we now no longer try to start the first round/stage until we
  have finished inserting all game records.
- When the lobby becomes full we now show the players a "Game loading" screen
  while we are getting the game ready for launch. This phase shouldn't take more
  than a few seconds but it can seem long when staring at the screen, so we
  added this new screen, which doubles as an indicator for the player to get
  ready for the game.
- Upgraded NPM packages: React, React Router, Simple Schema...
- We now overbook games proportionally to the playerCount.
- When games start with overbooked players, we try to reassign players to other
  games with the same treatment.
- Improved export performance.
- Upgraded Meteor to 1.7.0.5.

### Fixed

- Reset DB settings were not honored in a "production" deployment.
- Exit Steps now work in production build. See new Exit Step requirements in
  Changed section above.
- Example ExitSurvey component input fields no longer trim white spaces
  continuously, which was blocking the input of multiple words.
- `.set("key", undefined)` no longer explodes, now saves `undefined` as `null`,
  which is a suppoted value.
- Better automatic clearing of playerId on DB clearing. Now actually only
  happens if the DB is cleared.
- CSV Export is not longer mixing up fields.
- Loading issue between stages and at beginning of game.
- Re-regestering of player with same playerID in lobby.
- `.set()` value `0` was not supported, would be casted into `null`.
- Callbacks marking the end of the game (including the end of the last round
  and the last stage) were repeatedly called on a finished game until the whole
  batch had ended.

<!-- Add unreleased changes here -->

## 0.1.0 - 2018-05-16

### Added

- Initial Beta release.

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
