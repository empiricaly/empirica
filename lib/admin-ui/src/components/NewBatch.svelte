<script>
  import { currentAdmin } from "../utils/auth";
  import SlideOver from "./overlays/SlideOver.svelte";

  export let newBatch = false;

  function createBatch() {
    newBatch = false;
  }

  function init(el) {
    el.focus();
  }

  console.info($currentAdmin.createBatch);
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
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5"
        >
          <div>
            <label
              for="batch-configuration"
              class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2"
            >
              Configuration
            </label>
          </div>
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
                  <span>
                    Configuration as plain JSON. Better UI coming soon.
                  </span>
                </div>
              </div>
            </div>
          </div>
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
