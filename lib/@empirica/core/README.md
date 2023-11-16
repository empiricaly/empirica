# @empirica/core

The `@empirica/core` package contains multiple modules that are used by the
Empirica platform.

There are two main categories of modules:

- **Admin**: modules that are used with full access to Tajriba data and
  functionality. These modules are used by the Empirica Admin Panel and the
  server.
- **Player**: modules that are used by the Empirica Player. These modules are
  used in the frontend.

There is also a console module that is used throughout for logging.

Empirica is built on top of Tajriba, which is a server-side framework for
building experiments. Parts of the `@empirica/core` package are building blocks
on top of Tajriba and are not specific to Empirica.

The parts of the `@empirica/core` package that are specific to Empirica are
called `classic`. They implement the core functionality of Empirica, which are
objects such as Batches, Games, Players, Rounds and Stage, and the logic for
running Empirica experiments.

The `@empirica/core` package can be used to build different models of
experiments that do not follow the Empirica conventions.

## Module details

- **Admin**:
  - `admin`: the main admin module, which is not empirica-specific.
  - `admin/classic`: the Empirica logic for admin functionality.
- **Player**:
  - `player`: the main player module, which is not empirica-specific.
  - `player/react`: React utilities, which are not empirica-specific.
  - `player/classic`: the Empirica logic for player functionality.
  - `player/classic/react`: Empirica React utilities for players.
- **Utils**:
  - `utils/console`: logging facilities.
