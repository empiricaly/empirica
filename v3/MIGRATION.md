# Temporary home notice

This directory is the complete root of the future `empiricaly/empirica-v3`
repository, parked on the v2 repo's `claude/empirica-redesign-2ucv4y` branch
because the session's GitHub integration lacks org repo-creation rights.

To transplant once the empty repo exists (preserving this directory's history):

```sh
git subtree split --prefix=v3 -b v3-export
git push git@github.com:empiricaly/empirica-v3.git v3-export:main
```

Then delete this directory (and this file) from the v2 branch.
