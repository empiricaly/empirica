---
"@empirica/core": patch
---

You can now add a user with flags from the command line:

```bash
empirica --tajriba.auth.username "erica" --tajriba.auth.name "Erica" --tajriba.auth.password "mypassword"
```

You can also use environment variables:

```bash
export EMPIRICA_TAJRIBA_AUTH_USERNAME="erica"
export EMPIRICA_TAJRIBA_AUTH_NAME="Erica"
export EMPIRICA_TAJRIBA_AUTH_PASSWORD="mypassword"
empirica
```
