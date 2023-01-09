<script>
  import { currentAdmin } from "../../utils/auth.js";
  import Badge from "../common/Badge.svelte";
  import Button from "../common/Button.svelte";
  import TimeSince from "../common/TimeSince.svelte";
  import GamesLine from "../games/GamesLine.svelte";
  import PlayIcon from "../PlayIcon.svelte";
  import StopIcon from "../StopIcon.svelte";
  import FactorsString from "../treatments/FactorsString.svelte";

  export let batch;
  export let games;
  export let players;

  const config = batch.get("config");
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
    switch (batch.get("status")) {
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
        {
          key: "lobbyConfig",
          val: JSON.stringify(batch.get("lobbyConfig")),
          immutable: true,
        },
        { key: "status", val: JSON.stringify("created"), protected: true },
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
      if (confirm("Are you sure?")) {
        $currentAdmin.setAttribute({
          key: "status",
          val: JSON.stringify("terminated"),
          nodeID: batch.id,
        });
      }
    }
  }
</script>

<li data-test="batchLine" data-batch-line-id={batch.id}>
  <div class="block">
    <div class="flex items-top px-4 py-4 sm:px-6">
      <div class="flex min-w-0 flex-1 items-baseline">
        <div class="flex-shrink-0 -mt-1 h-min flex space-x-1 items-baseline">
          <Badge color={statusColor}>
            {status}
          </Badge>
        </div>
        <div class="min-w-0 flex-1 px-4 ">
          <div>
            <div class="truncate text-sm  flex space-x-1 items-baseline">
              <div class="font-medium text-empirica-600">
                {config.kind}
              </div>
              {#if config.kind === "simple"}
                <Badge>
                  {gameCount}
                  {gameCount === 1 ? "game" : "games"}
                </Badge>
              {/if}

              {#if status === "Running" || status === "Ended" || status === "Terminated" || status === "Failed"}
                {#if batch.attrs["status"]}
                  <div class="text-xs">
                    {#if status === "Running"}
                      Started
                    {:else if status === "Ended"}
                      Ended
                    {:else if status === "Terminated"}
                      Terminated
                    {:else if status === "Failed"}
                      Failed
                    {/if}

                    <TimeSince
                      time={new Date(batch.attrs["status"].createdAt)}
                    />
                  </div>
                {/if}
              {/if}
            </div>
            <p class="mt-2 flex items-center text-sm text-gray-500">
              <span class="truncate">
                <div class="flex flex-col divide-transparent divide-y-2 w-full">
                  {#if config.kind === "complete"}
                    {#each config.config.treatments as treatment}
                      <div class="flex items-center space-y-1">
                        <Badge>
                          {treatment.count}
                          {treatment.count === 1 ? "game" : "games"}
                        </Badge>
                        <div class="ml-2 overflow-ellipsis font-bold italic">
                          {treatment.treatment.name}
                        </div>
                        <div class="ml-2 truncate overflow-ellipsis opacity-60">
                          <FactorsString
                            factors={treatment.treatment.factors}
                          />
                        </div>
                      </div>
                    {/each}
                  {:else if config.kind === "simple"}
                    {#each config.config.treatments as treatment}
                      <div class="flex items-center space-y-1">
                        <div class="ml-2 overflow-ellipsis font-bold italic">
                          {treatment.name}
                        </div>
                        <div class="ml-2 truncate overflow-ellipsis opacity-60">
                          <FactorsString factors={treatment.factors} />
                        </div>
                      </div>
                    {/each}
                  {/if}
                </div>
                {#if status === "Running"}
                  <GamesLine {batch} {games} {players} />
                {/if}
              </span>
            </p>
          </div>
        </div>
      </div>
      <div class="space-x-2">
        {#if status === "Created"}
          <Button
            mini
            primary
            color="green"
            testId="startButton"
            on:click={start}
          >
            <div class="w-2 h-2 mr-2">
              <PlayIcon />
            </div>
            Start
          </Button>
        {:else if status === "Running"}
          <Button mini primary color="red" testId="stopButton" on:click={stop}>
            <div class="w-2 h-2 mr-2">
              <StopIcon />
            </div>
            Stop
          </Button>
        {/if}

        <Button mini color="gray" testId="duplicateButton" on:click={duplicate}>
          <div class="w-2 h-2 mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              class="mx-auto h-full w-full"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M0 224C0 188.7 28.65 160 64 160H128V288C128 341 170.1 384 224 384H352V448C352 483.3 323.3 512 288 512H64C28.65 512 0 483.3 0 448V224zM224 352C188.7 352 160 323.3 160 288V64C160 28.65 188.7 0 224 0H448C483.3 0 512 28.65 512 64V288C512 323.3 483.3 352 448 352H224z"
              /></svg
            >
          </div>
          Duplicate
        </Button>
      </div>
    </div>
  </div>
</li>
