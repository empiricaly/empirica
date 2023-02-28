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

<ul
  class="py-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
>
  {#each g as game (game.id)}
    <GameLine {game} {players} {playersStatusMap}/>
  {/each}
</ul>
