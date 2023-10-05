---
"@empirica/core": patch
---

Make the websocket connection non-blocking. This fixes issues where a zombie
websocket connection (not disconnected, but not keeping up with the messages
sent) could lock up the server. What we call zombie connections can happen when
a client is either totally non-responsive, or when the client is too slow to
process messages. Now, we will queue up to 500 messages per GraphQL
subscription, and if the client does not keep up, we will drop the connection.

This also makes websocket sends non-blocking, so we are no longer sending as
slowly as the slowest connection. This should greatly improve performance for
most clients that have a good connection. For clients with a bad connection,
they will still be slow, there is not much we can do about their internet
connection. But they will not slow down the server for everyone else. And we
have clear limits on how many messages we will queue up for them, so their
connection will reset after a while, which could help them reconnect and get a
better connection.
