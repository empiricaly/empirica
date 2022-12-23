<script>
  import { DEFAULT_LOBBY, ORIGIN } from "../../constants.js";
  import { castDuration, durationString } from "../../utils/time.js";
  import { focus } from "../../utils/use.js";
  import Badge from "../common/Badge.svelte";
  import ButtonGroup from "../common/ButtonGroup.svelte";
  import FormTip from "../common/FormTip.svelte";
  import Input from "../common/Input.svelte";
  import LabelBox from "../common/LabelBox.svelte";
  import Page from "../common/Page.svelte";
  import Trash from "../common/Trash.svelte";
  import Alert from "../layout/Alert.svelte";
  import SlideOver from "../overlays/SlideOver.svelte";

  let newLobby = false;

  let selectedLobby = { ...DEFAULT_LOBBY };
  let tempLobbies;
  let alertModal = false;
  let editedIndex;

  let lobbies;
  function showLobbyEditor(f = DEFAULT_LOBBY, index = undefined) {
    editedIndex = index;
    newLobby = true;
    selectedLobby = { ...f };
    if (!/[a-zA-Z]/.test(f.duration)) {
      selectedLobby.duration = durationString(f.duration);
    }
  }

  function handleDeleteLobby(index) {
    tempLobbies = lobbies;
    lobbies.lobbies = lobbies.lobbies.filter((_, i) => i !== index);
    alertModal = false;
    writeLobbiesToFile();
  }

  const actions = [
    {
      label: "New Configuration",
      onClick: () => showLobbyEditor(),
      testId: "newLobbyButton",
    },
  ];

  // Get treatments from file
  fetch(ORIGIN + "/lobbies")
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      lobbies = data;
    })
    .catch((error) => {
      console.info(error);
    });

  async function writeLobbiesToFile() {
    try {
      await fetch(ORIGIN + "/lobbies", {
        method: "PUT",
        body: JSON.stringify(lobbies),
      });
    } catch (error) {
      lobbies = tempLobbies;
      alert("Failed to write lobby configurations to lobbies.yaml file");
      console.error("write lobbies file", error);
    }
  }

  $: kindOptions = [
    {
      label: "Shared",
      onClick: () => (selectedLobby.kind = "shared"),
      selected: selectedLobby.kind === "shared",
      testId: "sharedKindButton",
    },
    {
      label: "Individual",
      onClick: () => (selectedLobby.kind = "individual"),
      selected: selectedLobby.kind === "individual",
      testId: "individualKindButton",
    },
  ];

  $: strategyOptions = [
    {
      label: "Fail",
      onClick: () => (selectedLobby.strategy = "fail"),
      selected: selectedLobby.strategy === "fail",
      testId: "failStrategyButton",
    },
    {
      label: "Ignore",
      onClick: () => (selectedLobby.strategy = "ignore"),
      selected: selectedLobby.strategy === "ignore",
      testId: "ignoreStrategyButton",
    },
  ];

  async function saveLobby(e) {
    e.preventDefault();
    tempLobbies = lobbies;

    let msg = validateLobby();
    if (msg) {
      alert(msg);
      return;
    }

    if (editedIndex !== undefined && lobbies?.lobbies) {
      lobbies.lobbies = lobbies.lobbies.filter((_, i) => i !== editedIndex);
    }

    if (!lobbies) {
      lobbies = {};
    }

    if (!lobbies.lobbies) {
      lobbies.lobbies = [];
    }

    selectedLobby.duration = castDuration(selectedLobby.duration);

    lobbies.lobbies.push(selectedLobby);

    lobbies = lobbies;
    selectedLobby = { ...DEFAULT_LOBBY };
    newLobby = false;

    writeLobbiesToFile();
  }

  function validateLobby() {
    let msg;

    if (
      editedIndex === undefined &&
      lobbies?.lobbies &&
      selectedLobby.name.length > 0
    ) {
      const lobby = lobbies.lobbies.filter(
        (f) => f.name === selectedLobby.name
      );
      if (lobby.length > 0) {
        msg = "Lobby Configuration name already exist";
      }
    }

    try {
      castDuration(selectedLobby.duration);
    } catch (error) {
      return "Invalid duration";
    }

    return msg;
  }
</script>

<Page title="Lobby Configurations" {actions}>
  <span slot="labels">
    Lobby configurations defines the behavior of timeouts in the Game Lobby. You
    can edit Lobby Configurations here or in the
    <code>.empirica/lobbies.yaml</code> file. Updates are automatically saved on
    this page. If you make changes to the yaml file, make sure to reload this page.
  </span>

  <ul class="divide-y divide-gray-200">
    {#if lobbies && lobbies.lobbies}
      {#each lobbies.lobbies as f, i (f)}
        <li class="hover:bg-gray-50 px-4 py-4 flex items-center sm:px-8">
          <button
            type="button"
            on:click={() => showLobbyEditor(f, i)}
            class="w-full focus:outline-none text-left"
          >
            <div
              class="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between"
            >
              <div class="truncate">
                <div class="flex text-sm">
                  <p class="font-medium text-empirica-600 truncate">
                    {f.name || ""}
                  </p>
                </div>
                {#if f.desc}
                  <div class="flex text-sm">
                    <p class="font-normal text-gray-400 truncate">
                      {f.desc}
                    </p>
                  </div>
                {/if}
                <div class="flex">
                  <div class="flex items-center text-gray-500 text-sm pt-2">
                    <dir>
                      <Badge>
                        {f.kind}
                      </Badge>
                    </dir>
                    <dir>
                      {durationString(f.duration)}
                    </dir>
                    {#if f.kind === "shared"}
                      <dir>
                        {f.strategy}
                      </dir>
                    {/if}
                    <!-- {#if f.kind === "individual"}
                      <dir>
                        {f.extensions || 0}
                      </dir>
                    {/if} -->
                  </div>
                </div>
              </div>
            </div>
          </button>
          <button
            type="button"
            class="focus:outline-none"
            on:click={() => {
              alertModal = true;
            }}><div class="h-5 w-5"><Trash /></div></button
          >
          {#if alertModal}
            <Alert
              title="Delete Configuration"
              onCancel={() => {
                alertModal = false;
              }}
              desc="Are you sure want to delete this lobby configuration?"
              confirmText="Delete"
              onConfirm={() => handleDeleteLobby(i)}
            />
          {/if}
        </li>
      {/each}
    {:else}
      <div class="px-4 py-4 sm:px-8">
        No Lobby Configurations yet.
        <button
          type="button"
          class="text-empirica-500"
          on:click={() => showLobbyEditor()}
        >
          Create a Lobby Configuration
        </button>
      </div>
    {/if}
  </ul>

  <SlideOver custom disableBgCloseClick bind:open={newLobby}>
    <div class="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
      <div class="flex-1">
        <!-- Header -->
        <div class="px-4 py-6 bg-gray-50 sm:px-6">
          <div class="flex items-start justify-between space-x-3">
            <div class="space-y-1">
              <h2
                class="text-lg font-medium text-gray-900"
                id="slide-over-title"
              >
                {#if editedIndex !== undefined}
                  Edit Lobby Configuration
                {:else}
                  New Lobby Configuration
                {/if}
              </h2>
              <p class="text-sm text-gray-500">
                Get started by filling in the information below to {editedIndex !==
                undefined
                  ? "edit your"
                  : "create your new"}
                Lobby Configuration.
              </p>
            </div>
          </div>
        </div>

        <!-- Divider container -->
        <div class="py-4 space-y-6 sm:py-0 sm:space-y-0 sm:divide-gray-200">
          <div
            class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:px-6 sm:py-3"
          >
            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2"
              >
                Name
              </label>
            </div>
            <div class="sm:col-span-2">
              <input
                use:focus
                bind:value={selectedLobby.name}
                id="name"
                name="name"
                class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
              />
            </div>
          </div>

          <div
            class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:px-6 sm:py-3"
          >
            <div class="flex justify-between col-span-2">
              <label for="email" class="block text-sm font-medium text-gray-700"
                >Description</label
              >
              <span class="text-sm text-gray-500">Optional</span>
            </div>
            <div class="sm:col-span-2">
              <textarea
                bind:value={selectedLobby.desc}
                id="description"
                name="description"
                rows="3"
                class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
              />
            </div>
          </div>
          <div
            class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:px-6 sm:py-3"
          >
            <LabelBox label="Kind">
              <ButtonGroup options={kindOptions} />
            </LabelBox>
          </div>

          <div class="space-y-1 px-4 sm:px-6 sm:py-3">
            <LabelBox label="Duration">
              <Input
                placeholder="5m"
                testId="durationInput"
                bind:value={selectedLobby.duration}
              />
            </LabelBox>

            <FormTip>
              Duration must be provided with unit: either 'm' for minute or 's'
              for second.
            </FormTip>
          </div>

          {#if selectedLobby.kind === "shared"}
            <div class="space-y-1 px-4 sm:px-6 sm:py-3">
              <LabelBox label="Strategy">
                <ButtonGroup options={strategyOptions} />
              </LabelBox>

              <FormTip>
                On timeout, fail will cancel the game, and ignore will start the
                game anyway.
              </FormTip>
            </div>
          {/if}

          <!-- {#if selectedLobby.kind === "individual"}
            <div class="space-y-1 px-4 sm:px-6 sm:py-3">
              <LabelBox label="Extensions">
                <Input
                  type="number"
                  placeholder="0"
                  testId="extensionsInput"
                  bind:value={selectedLobby.extensions}
                />
              </LabelBox>

              <FormTip>
                Number of times the player can extend their timeout.
              </FormTip>
            </div>
          {/if} -->
        </div>

        <!-- Action buttons -->
        <div class="flex-shrink-0 px-4 border-t border-gray-200 py-5 sm:px-6">
          <div class="space-x-3 flex justify-end">
            <button
              type="button"
              class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
              on:click={() => (newLobby = false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              on:click={saveLobby}
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </SlideOver>
</Page>
