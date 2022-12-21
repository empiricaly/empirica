<script>
  import GameLine from "./GameLine.svelte";
  export let batch;
  export let games;
  export let players;

  $: g = games
    ? games.filter((g) => g.id && g.get("batchID") === batch.id)
    : [];
</script>

<ul
  class="py-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
>
  {#each g as game (game.id)}
    <GameLine {game} {players} />
  {/each}
</ul>
