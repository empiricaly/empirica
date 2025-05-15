---
"@empirica/core": patch
---

Fix assignment logic when using `preferUnderassignedGames` and `neverOverbookGames` so players are never assigned from an empty game list and batches are respected in order.

The assignment algorithm has been re-worked. It's the same behavior overall, but we've improved the resilience of the algorithm. Here's a run down of the algorithm:

• The server walks through *running* batches in the order they were created. Players stay in the first batch that can still host them. We only spill into later batches when `neverOverbookGames` is enabled and every game in the current batch is already full.

• For each batch we build two lists
  – *candidate games* (all games that could potentially host the player)
  – *open-slot games* (those candidate games that still have at least one seat, based on the `playerCount` factor)

• Decision per batch
  – `preferUnderassignedGames` or `neverOverbookGames` → we first try *open-slot games*.
  – If `preferUnderassignedGames` is set **alone**, we fall back to over-booking within the same batch.
  – If `neverOverbookGames` is set we *do not* over-book; instead we look at the next batch and, if no batch can host the player, we exit them immediately with the message "no more games".
  – When none of the flags are used we assign directly to any candidate game in the first eligible batch (previous behaviour).

• A player is only marked as *ended* when
  – `neverOverbookGames` is active and we exhaust all batches, **or**
  – the player had previously been assigned/un-assigned (their `gameID` attribute exists).
  This allows brand-new visitors to keep waiting in the lobby until a future batch is created.

The change also adds thorough inline comments explaining every step of the algorithm for future maintainers.

`disableAssignment` still short-circuits the whole process for advanced users who want to manage assignments manually. We recommend leaving this option off unless you know exactly what you are doing.