<script>
  import { link } from "svelte-spa-router";
  import { URL } from "../constants";
  import Trash from "./common/Trash.svelte";
  import SlideOver from "./overlays/SlideOver.svelte";

  export let newBatch = false;

  function createBatch() {
    newBatch = false;
  }

  function init(el) {
    el.focus();
  }

  let availTreatments = [];
  let rawTreatments = [];

  $: {
    fetch(URL + "/treatments")
      .then((response) => response.json())
      .then((data) => {
        rawTreatments = data;
        availTreatments = data.treatments.map((t) => t.name);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  function getTotalGames() {
    return treatments.reduce((a, b) => a.gameCount + b.gameCount, 0);
  }

  function getRemainingTreatments() {
    if (treatments.length === 0) {
      return availTreatments;
    }

    const remainingTreatments = [];

    for (const t of availTreatments) {
      const treatment = treatments.find((tt) => tt.name === t);
      if (!treatment) {
        remainingTreatments.push(t);
      }
    }

    return remainingTreatments;
  }

  let assignmentMethod = "simple";
  let treatments = [];
  let gameCount;
  let selectedTreatment;
</script>

<SlideOver custom bind:open={newBatch}>
  <form class="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
    <div class="flex-1">
      <!-- Header -->
      <div class="px-4 py-6 bg-gray-50 sm:px-6">
        <div class="flex items-start justify-between space-x-3">
          <div class="space-y-1">
            <h2 class="text-lg font-medium text-gray-900" id="slide-over-title">
              New Batch
            </h2>
            <p class="text-sm text-gray-500">
              Get started by filling in the information below to create your new
              batch.
            </p>
          </div>
          <div class="h-7 flex items-center">
            <button
              type="button"
              class="text-gray-400 hover:text-gray-500"
              on:click={() => (newBatch = false)}
            >
              <span class="sr-only">Close panel</span>
              <!-- Heroicon name: outline/x -->
              <svg
                class="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Divider container -->
      <div
        class="py-6 space-y-6 sm:py-0 sm:space-y-0 sm:divide-y sm:divide-gray-200"
      >
        <!-- Project description -->
        <div
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-2 sm:px-6 sm:py-5"
        >
          <label
            for="batch-configuration"
            class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-1 col-span-3"
          >
            Assignment Method
          </label>
          <!-- Assignment method radio button -->
          <div class="flex col-span-3">
            <div class="bg-gray-200 rounded-lg">
              <div class="inline-flex rounded-lg">
                <input
                  type="radio"
                  name="assignment_method"
                  id="simple"
                  checked
                  hidden
                  bind:group={assignmentMethod}
                  value="simple"
                />
                <label
                  for="simple"
                  class="radio text-center self-center py-2 px-4 rounded-lg cursor-pointer hover:opacity-75"
                  >Simple</label
                >
              </div>
              <div class="inline-flex rounded-lg">
                <input
                  type="radio"
                  name="assignment_method"
                  id="complete"
                  hidden
                  bind:group={assignmentMethod}
                  value="complete"
                />
                <label
                  for="complete"
                  class="radio text-center self-center py-2 px-4 rounded-lg cursor-pointer hover:opacity-75"
                  >Complete</label
                >
              </div>
              <div class="inline-flex rounded-lg">
                <input
                  type="radio"
                  name="assignment_method"
                  id="custom"
                  hidden
                  bind:group={assignmentMethod}
                  value="custom"
                />
                <label
                  for="custom"
                  class="radio text-center self-center py-2 px-4 rounded-lg cursor-pointer hover:opacity-75"
                  >Custom</label
                >
              </div>
            </div>
          </div>
          <!-- End of assignment method radio button -->

          {#if assignmentMethod === "custom"}
            <div class="col-span-3">
              <label
                for="batch-configuration"
                class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2 mb-2"
              >
                Configuration
              </label>
              <div class="sm:col-span-2">
                <textarea
                  use:init
                  id="batch-configuration"
                  name="configuration"
                  rows="10"
                  class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
                />

                <div
                  class="flex flex-col space-between sm:flex-row sm:items-center sm:space-between mt-2"
                >
                  <div>
                    <div
                      class="group flex items-center text-sm text-gray-500 space-x-2.5"
                    >
                      <!-- Heroicon name: solid/question-mark-circle -->
                      <svg
                        class="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span> Must be valid JSON.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {:else if availTreatments.length === 0}
            <div class="col-span-3 flex flex-col items-center pt-5">
              <svg
                class="text-gray-300 mr-3 flex-shrink-0 h-12 w-12"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d={"M160 168v-48c0-13.3-10.7-24-24-24H96V8c0-4.4-3.6-8-8-8H72c-4.4 0-8 3.6-8 8v88H24c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h40v312c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8V192h40c13.3 0 24-10.7 24-24zm-32-8H32v-32h96v32zm152 160h-40V8c0-4.4-3.6-8-8-8h-16c-4.4 0-8 3.6-8 8v312h-40c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h40v88c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8v-88h40c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zm-8 64h-96v-32h96v32zm152-224h-40V8c0-4.4-3.6-8-8-8h-16c-4.4 0-8 3.6-8 8v152h-40c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h40v248c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8V256h40c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zm-8 64h-96v-32h96v32z"}
                />
              </svg>
              <span>
                No treatments yet. <a
                  href="/treatments"
                  use:link
                  class="text-empirica-600"
                  >Add some.
                </a>
              </span>
            </div>
          {:else}
            <label
              for="treatments"
              class="treatments block text-sm font-medium text-gray-900 sm:mt-px sm:pt-1 col-span-3"
            >
              Treatments
            </label>
            <!-- Treatment List -->
            {#each treatments as t, i}
              <select
                bind:value={t.name}
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 sm:text-sm rounded-md col-span-{assignmentMethod ===
                'simple'
                  ? '2'
                  : '1'}"
              >
                <option value={t.name}>{t.name}</option>
                {#if getRemainingTreatments().length > 0}
                  {#each getRemainingTreatments() as ot, i}
                    <option value={ot}>{ot}</option>
                  {/each}
                {/if}
              </select>

              {#if assignmentMethod === "complete"}
                <div class="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    class="focus:ring-empirica-500 focus:border-empirica-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    bind:value={t.gameCount}
                    aria-describedby="price-currency"
                  />
                  <div
                    class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                  >
                    <span class="text-gray-500 sm:text-sm">
                      {t.gameCount > 1 ? "games" : "game"}
                    </span>
                  </div>
                </div>
              {/if}

              <button
                on:click={(e) => {
                  e.preventDefault();
                  treatments = treatments.filter((_, j) => j !== i);
                }}
              >
                <div class="h-4 w-4"><Trash /></div>
              </button>
            {/each}

            <!-- Start remaining Tratment -->
            {#if getRemainingTreatments().length === 0}
              <p class="text-sm">No more Treatments</p>
            {:else}
              <select
                id="remaining-treatments"
                name="remaining-treatments"
                bind:value={selectedTreatment}
                on:change={() => {
                  if (!selectedTreatment) {
                    return;
                  }

                  treatments.push({ name: selectedTreatment, gameCount: 1 });
                  treatments = treatments;
                }}
                class="mt-1 block w-6/12 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 sm:text-sm rounded-md col-span-3"
              >
                <option value="">Add Treatment</option>
                {#each getRemainingTreatments() as t, i (t)}
                  <option value={t}>{t}</option>
                {/each}
              </select>
            {/if}
            <!-- End remaining section -->

            <!-- start Game count section -->
            {#if assignmentMethod === "simple"}
              <label
                for="game-count"
                class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-1 col-span-3"
              >
                Game Count
              </label>
              <input
                name="game-count"
                placeholder="Enter games count"
                bind:value={gameCount}
                type="text"
                class="block w-full h-9 px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
              />
            {:else}
              <p class="text-sm">{getTotalGames()} games in total</p>
            {/if}
            <!-- End game count section -->
          {/if}
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex-shrink-0 px-4 border-t border-gray-200 py-5 sm:px-6">
      <div class="space-x-3 flex justify-end">
        <button
          type="button"
          class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          on:click={() => (newBatch = false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          on:click={createBatch}
        >
          Create
        </button>
      </div>
    </div>
  </form>
</SlideOver>

<style>
  input:checked ~ .radio {
    color: white;
    background-color: green;
  }
</style>
