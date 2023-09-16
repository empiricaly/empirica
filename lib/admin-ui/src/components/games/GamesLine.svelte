<script>
  import { onMount } from "svelte";
  import GameLine from "./GameLine.svelte";

  import { EventType } from "@empirica/tajriba";

  import { currentAdmin } from "../../utils/auth.js";

  export let batch;
  export let games;
  export let players;

  $: playersStatusMap = new Map();

  $: g = games
    ? games.filter((g) => g.id && g.get("batchID") === batch.id)
    : [];

  onMount(async function () {
    $currentAdmin
      .onEvent({
        eventTypes: [
          EventType.ParticipantConnected,
          EventType.ParticipantDisconnect,
        ],
      })
      .subscribe({
        next({ eventType, node }) {
          if (!node) return;

          switch (eventType) {
            case EventType.ParticipantConnected:
              playersStatusMap.set(node.id, true);
              playersStatusMap = playersStatusMap;

              break;
            case EventType.ParticipantDisconnect:
              playersStatusMap.set(node.id, false);
              playersStatusMap = playersStatusMap;
              break;
          }
        },
      });
  });
</script>

<table class="min-w-full divide-y divide-gray-300 w-full">
  <thead>
    <tr>
      <!-- <th
        scope="col"
        class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
      >
        #
      </th> -->
      <th
        scope="col"
        class="px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
      >
        Status
      </th>
      <th
        scope="col"
        class="px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
      >
        Treatment
      </th>
      <th
        scope="col"
        class="px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
      >
        Start Time
      </th>
      <th
        scope="col"
        class="px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
      >
        Finish Time
      </th>
      <!-- <th
        scope="col"
        class="px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
      >
        Current
      </th> -->
      <th
        scope="col"
        class="px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
      >
        Player count
      </th>
      <th scope="col" class="relative py-1.5 pl-3 pr-4 sm:pr-0"> Players </th>
    </tr>
  </thead>
  <tbody class="divide-y divide-gray-200">
    {#each g as game (game.id)}
      <GameLine {game} {players} {playersStatusMap} />
    {/each}
  </tbody>
</table>
