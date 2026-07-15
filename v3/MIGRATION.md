# Temporary home notice

This directory is the complete root of the future `empiricaly/empirica-v3`
repository, parked on the v2 repo's `claude/empirica-redesign-2ucv4y` branch
because the session's GitHub integration lacks org repo-creation rights.

Two transplant options once the empty repo exists:

**Plain copy (simplest — history stays discoverable on the v2 branch):** copy the
contents of `v3/` to the new repo root, commit as "import v3 design + M0 skeleton
(developed on empiricaly/empirica#<branch/PR>)", follow `KICKOFF.md`.

**History-preserving:**

```sh
git subtree split --prefix=v3 -b v3-export
git push git@github.com:empiricaly/empirica-v3.git v3-export:main
```

Either way: delete this directory from the v2 branch afterwards, and delete
MIGRATION.md + KICKOFF.md from the new repo once used.
