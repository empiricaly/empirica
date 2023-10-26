---
"@empirica/core": patch
---

Further improvements to websockets: we no longer kill the connection when the
buffer runs out, instead of we block, as we used to. This is done so that
exceptional spikes (initial loads) can be handled. A connection that does not
manage to decrease the size of their buffer will be disconnected after 10
seconds, so we shouldn't get blocked indefinitely if there is a bad conn.
The assumption here is that initial loads are worse on the admin/server side,
since it needs to load much larger amounts of data, and that the client will
usually not reach the buffer limit. Meanwhile, the clients are usually the ones
that have connection problems. So we want to disconnect them before they reach
the buffer limit, but not disconnect the server-side while it is still loading
initial data.
