<script>
  import BatchLine from "./BatchLine.svelte";
  import NewBatch from "./NewBatch.svelte";

  let newBatch = false;
</script>

<main class="flex-1 relative z-0 overflow-y-auto focus:outline-none">
  <!-- Page title & actions -->
  <div
    class="border-b border-gray-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8"
  >
    <div class="flex-1 min-w-0">
      <h1 class="text-lg font-medium leading-6 text-gray-900 sm:truncate">
        Batches
      </h1>
    </div>
    <div class="mt-4 flex sm:mt-0 sm:ml-4">
      <button
        type="button"
        class="order-0 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 sm:order-1 sm:ml-3"
        on:click={() => (newBatch = true)}
      >
        New Batch
      </button>
    </div>
  </div>

  <!-- Projects table (small breakpoint and up) -->
  <div class="hidden sm:block">
    <div class="align-middle inline-block min-w-full border-b border-gray-200">
      <table class="min-w-full">
        <thead>
          <!-- <tr class="border-t border-gray-200"> -->
          <tr class="">
            <th
              class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <span class="lg:pl-2">Status</span>
            </th>
            <th
              class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Created
            </th>
            <th
              class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Started
            </th>
            <th
              class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Ended
            </th>
            <th
              class="px-6 py-3 border-b whitespace-nowrap border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Game Count
            </th>
            <th
              class="pr-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            />
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          <BatchLine />
          <BatchLine />
          <BatchLine />

          <!-- More projects... -->
        </tbody>
      </table>
    </div>
  </div>
</main>

<NewBatch bind:newBatch />
