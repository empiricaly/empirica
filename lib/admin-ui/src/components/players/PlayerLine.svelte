<script>
  import { currentAdmin } from "../../utils/auth.js";
  import Badge from "../common/Badge.svelte";
  import Button from "../common/Button.svelte";

  export let player;
  export let online = false;

  function clear() {
    $currentAdmin.setAttribute({
      key: "ended",
      val: JSON.stringify(null),
      nodeID: player.id,
    });
  }
</script>

<li data-test="playerLine" data-player-line-id={player.id}>
  <div class="block">
    <div class="flex items-top px-4 py-4 sm:px-6">
      <div class="flex min-w-0 flex-1 items-baseline space-x-2">
        <div class="flex-shrink-0 -mt-1 h-min flex space-x-1 items-baseline">
          <Badge color={online ? "green" : "gray"}>
            {online ? "Online" : "Offline"}
          </Badge>
        </div>

        <div class="text-sm">
          {player.get("participantIdentifier") || player.get("participantID")}
        </div>
      </div>
      <div class="flex items-baseline space-x-2">
        {#if player.get("ended")}
          <div class="text-sm">
            {player.get("ended")}
          </div>

          <Button mini color="red" testId="clearButton" on:click={clear}>
            <div class="w-2 h-2 mr-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                class="mx-auto h-full w-full"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H464c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0s-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0L386.3 160z"
                /></svg
              >
            </div>
            Clear
          </Button>
        {/if}
      </div>
    </div>
  </div>
</li>
