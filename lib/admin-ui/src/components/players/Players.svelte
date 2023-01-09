<script>
  import { EventType } from "@empirica/tajriba";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import { currentAdmin } from "../../utils/auth.js";
  import Page from "../common/Page.svelte";
  import PlayerLine from "./PlayerLine.svelte";

  const players = writable([]);

  const compareNodes = (a, b) => {
    return a.id > b.id ? -1 : 1;
  };

  const playersMap = new Map();
  const playersStatusMap = new Map();

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
          switch (eventType) {
            case EventType.ParticipantConnected:
              playersStatusMap.set(node.id, true);
              players.update((p) => p);
              break;
            case EventType.ParticipantDisconnect:
              playersStatusMap.set(node.id, false);
              players.update((p) => p);
              break;
          }
        },
      });

    $currentAdmin.scopedAttributes([{ kinds: ["player"] }]).subscribe({
      next({ attribute }) {
        if (!attribute) {
          return;
        }

        switch (attribute.node.kind) {
          case "player":
            let player = playersMap.get(attribute.node.id);
            if (!player) {
              player = {
                id: attribute.node.id,
                identifier: attribute.node.identifier,
                attrs: {},
                attributes: {},
                get(key) {
                  return this.attributes[key];
                },
              };
              playersMap.set(attribute.node.id, player);
              players.set(Array.from(playersMap.values()).sort(compareNodes));
            }

            let valp;
            if (attribute.val) {
              valp = JSON.parse(attribute.val);
            }

            player.attributes[attribute.key] = valp;
            player.attrs[attribute.key] = attribute;
            players.set(Array.from(playersMap.values()).sort(compareNodes));
            break;
        }
      },
    });
  });
</script>

<Page title="Players">
  <span slot="labels"> Listing of all Players in this experiment. </span>

  {#if $players.length === 0}
    <div class="max-w-3xl w-full">
      <div
        class="relative block w-full rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <slot name="svg">
          <svg
            class="mx-auto text-gray-400 h-12 w-12"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 512"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M544 224c44.2 0 80-35.8 80-80s-35.8-80-80-80-80 35.8-80 80 35.8
        80 80 80zm0-128c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48
        48-48zM320 256c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208
        144s50.1 112 112 112zm0-192c44.1 0 80 35.9 80 80s-35.9 80-80
        80-80-35.9-80-80 35.9-80 80-80zm244 192h-40c-15.2 0-29.3 4.8-41.1 12.9 9.4
        6.4 17.9 13.9 25.4 22.4 4.9-2.1 10.2-3.3 15.7-3.3h40c24.2 0 44 21.5 44 48
        0 8.8 7.2 16 16 16s16-7.2 16-16c0-44.1-34.1-80-76-80zM96 224c44.2 0
        80-35.8 80-80s-35.8-80-80-80-80 35.8-80 80 35.8 80 80 80zm0-128c26.5 0 48
        21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm304.1 180c-33.4
        0-41.7 12-80.1 12-38.4 0-46.7-12-80.1-12-36.3 0-71.6 16.2-92.3 46.9-12.4
        18.4-19.6 40.5-19.6 64.3V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5
        48-48v-44.8c0-23.8-7.2-45.9-19.6-64.3-20.7-30.7-56-46.9-92.3-46.9zM480
        432c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16v-44.8c0-16.6 4.9-32.7
        14.1-46.4 13.8-20.5 38.4-32.8 65.7-32.8 27.4 0 37.2 12 80.2 12s52.8-12
        80.1-12c27.3 0 51.9 12.3 65.7 32.8 9.2 13.7 14.1 29.8 14.1 46.4V432zM157.1
        268.9c-11.9-8.1-26-12.9-41.1-12.9H76c-41.9 0-76 35.9-76 80 0 8.8 7.2 16 16
        16s16-7.2 16-16c0-26.5 19.8-48 44-48h40c5.5 0 10.8 1.2 15.7 3.3 7.5-8.5
        16.1-16 25.4-22.4z"
            />
          </svg>
        </slot>
        <span class="mt-3 block text-sm font-medium text-gray-900">
          No players yet
        </span>
      </div>
    </div>
  {:else}
    <!-- Projects table (small breakpoint and up) -->
    <div class="overflow-hidden bg-white shadow sm:rounded-md">
      <ul class="divide-y divide-gray-200">
        {#each $players as player (player.id)}
          {#if player.get("participantID")}
            <PlayerLine
              {player}
              online={playersStatusMap.get(player.get("participantID"))}
            />
          {/if}
        {/each}
      </ul>
    </div>
  {/if}
</Page>
