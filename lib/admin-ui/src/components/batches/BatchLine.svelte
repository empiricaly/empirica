<script>
  import { cubicInOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import { currentAdmin } from "../../utils/auth";
  import { clickOutside } from "../../utils/clickoutside";
  import Badge from "../common/Badge.svelte";
  import Button from "../common/Button.svelte";
  import PlayIcon from "../PlayIcon.svelte";
  import StopIcon from "../StopIcon.svelte";
  import FactorsString from "../treatments/FactorsString.svelte";

  export let batch;

  let open = false;

  function clickOutsideHandler() {
    open = false;
  }

  const config = batch.attributes["config"];
  console.log(config);
  let gameCount = "unknown";

  switch (config.kind) {
    case "simple":
      gameCount = config.config.count;
      break;
    case "complete":
      gameCount = config.config.treatments.reduce((s, t) => s + t.count, 0);
      break;
  }

  let statusColor = "gray";
  let status = "Created";
  $: {
    switch (batch.attributes["status"]) {
      case "running":
        status = "Running";
        statusColor = "green";
        break;
      case "ended":
        status = "Ended";
        statusColor = "gray";
        break;
      case "terminated":
        status = "Terminated";
        statusColor = "red";
        break;
      case "failed":
        status = "Failed";
        statusColor = "yellow";
        break;
      default:
        status = "Created";
        statusColor = "blue";
    }
  }

  function duplicate() {
    $currentAdmin.addScope({
      kind: "batch",
      attributes: [
        { key: "config", val: JSON.stringify(config), immutable: true },
      ],
    });
    // $currentAdmin.createBatch({ config });
  }

  function start() {
    if (status === "Created") {
      $currentAdmin.setAttribute({
        key: "status",
        val: JSON.stringify("running"),
        nodeID: batch.id,
      });
    }
  }

  function stop() {
    if (status === "Running") {
      $currentAdmin.setAttribute({
        key: "status",
        val: JSON.stringify("ended"),
        nodeID: batch.id,
      });
    }
  }
</script>

<tr>
  <td class="py-3 px-6 text-sm font-mediu align-top text-center">
    <Badge color={statusColor}>
      {status}
    </Badge>
  </td>
  <td class="px-6 py-3 whitespace-nowrap text-sm  align-top">
    <div class="flex items-start h-full">
      {config.kind}
    </div>
  </td>
  <td
    class="hidden md:table-cell px-6 py-3 whitespace-nowrap text-sm w-full align-top"
  >
    <div class="flex flex-col divide-transparent divide-y-2 w-full">
      {#if config.kind === "complete"}
        {#each config.config.treatments as treatment}
          <div class="flex items-center">
            <Badge>
              {treatment.count}
              {treatment.count === 1 ? "game" : "games"}
            </Badge>
            <div class="ml-2 truncate overflow-ellipsis italic">
              {treatment.treatment.name}
            </div>
            <div class="ml-2 truncate max-w-12 overflow-ellipsis opacity-60">
              <FactorsString factors={treatment.treatment.factors} />
            </div>
          </div>
        {/each}
      {:else if config.kind === "simple"}
        {#each config.config.treatments as treatment}
          <div class="flex items-center">
            <div class="ml-2 truncate overflow-ellipsis italic">
              {treatment.name}
            </div>
            <div class="ml-2 truncate overflow-ellipsis opacity-60">
              <FactorsString factors={treatment.factors} />
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </td>

  <td
    class="max-w-0 w-full whitespace-nowrap md:table-cell px-6 py-3 text-sm text-center align-top"
  >
    {gameCount}
  </td>
  <td
    class="max-w-0 w-full whitespace-nowrap md:table-cell px-6 py-2 text-sm text-center align-top"
  >
    {#if status === "Created"}
      <Button mini primary color="green" on:click={start}>
        <div class="w-2 h-2 mr-2">
          <PlayIcon />
        </div>
        Start
      </Button>
    {:else if status === "Running"}
      <!-- else if content here -->
      <Button mini primary color="red" on:click={stop}>
        <div class="w-2 h-2 mr-2">
          <StopIcon />
        </div>
        Stop
      </Button>
    {/if}
  </td>
  <td class="pr-6 py-2 align-top">
    <div class="relative flex justify-end items-center">
      <button
        type="button"
        class="w-8 h-8 bg-white inline-flex items-center justify-center text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
        id="project-options-menu-0-button"
        aria-expanded="false"
        aria-haspopup="true"
        on:click={() => (open = !open)}
      >
        <span class="sr-only">Open actions</span>
        <!-- Heroicon name: solid/dots-vertical -->
        <svg
          class="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
          />
        </svg>
      </button>

      {#if open}
        <div
          transition:fly={{
            duration: 100,
            x: 0,
            y: 20,
            opacity: 0,
            easing: cubicInOut,
          }}
          class="mx-3 origin-top-right absolute right-7 top-0 w-48 mt-1 rounded-md shadow-lg z-10 bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="project-options-menu-0-button"
          tabindex="-1"
          use:clickOutside={clickOutsideHandler}
        >
          <div class="py-1" role="none">
            <!-- Active: "bg-gray-100 text-gray-900", Not Active: "text-gray-700" -->
            <!-- <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-0"
            >
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"
                />
                <path
                  fill-rule="evenodd"
                  d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                  clip-rule="evenodd"
                />
              </svg>
              Edit
            </button> -->
            <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm w-full"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-1"
              on:click={duplicate}
            >
              <!-- Heroicon name: solid/duplicate -->
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"
                />
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
              </svg>
              Duplicate
            </button>
          </div>
          <!-- <div class="py-1" role="none">
            <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-3"
            >
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              Delete
            </button>
          </div> -->
        </div>
      {/if}
    </div>
  </td>
</tr>
