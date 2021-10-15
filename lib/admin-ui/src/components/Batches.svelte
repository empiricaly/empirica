<script>
  import { currentAdmin } from "../utils/auth";
  import BatchLine from "./BatchLine.svelte";
  import Button from "./common/Button.svelte";
  import NewBatch from "./NewBatch.svelte";

  let newBatch = false;

  console.info($currentAdmin);
</script>

<main class="flex-1 relative z-0 overflow-y-auto focus:outline-none">
  <div
    class="md:flex md:items-center md:justify-between px-4 pt-4 sm:px-6 lg:px-8"
  >
    <div class="flex-1 min-w-0">
      <h2
        class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate"
      >
        Batches
      </h2>

      <div class="py-4 sm:flex sm:items-center sm:justify-between">
        <p class="text-sm font-small text-gray-500 pr-32">
          Batches are groups of Games. You start Games through a Batch. Within a
          Batch, Games can be assigned differently depending on you Assignement
          Configuration. Start by creating a New Batch.
        </p>

        <div class="mt-4 flex sm:mt-0 sm:ml-4">
          <Button on:click={() => (newBatch = true)}>New Batch</Button>
        </div>
      </div>
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
