# {{name}}

Minimal Empirica project.

## Develop

```sh
pnpm install
pnpm dev          # starts the server on :4321
# in another shell:
npx vite          # starts the player UI on :5174
```

Then open the admin UI at <http://localhost:4321/admin> and the player UI at
<http://localhost:5174/?p=&lt;participant-token&gt;>.

The default admin login is `admin` / `admin`. Change `ADMIN_PASSWORD` in your
environment to set your own.
