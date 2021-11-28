<script>
  import { currentAdmin } from "../../utils/auth";
  import EmptyState from "../common/EmptyState.svelte";
  import Page from "../common/Page.svelte";
  import BatchLine from "./BatchLine.svelte";
  import FetchTreatments from "./FetchTreatments.svelte";
  import NewBatch from "./NewBatch.svelte";

  let newBatch = false;
  const openNewBatch = () => (newBatch = true);

  const actions = [
    {
      label: "New Batch",
      onClick: openNewBatch,
    },
  ];

  const batches = $currentAdmin.batchesSub;
</script>

<Page title="Batches" {actions}>
  <span slot="labels">
    Batches are groups of Games. You start Games through a Batch. Within a
    Batch, Games can be assigned differently depending on you Assignement
    Configuration. Start by creating a New Batch.
  </span>

  {#if $batches.length === 0}
    <div class="max-w-3xl w-full">
      <EmptyState
        svgPath="M512 256.01c0-9.98-5.81-18.94-14.77-22.81l-99.74-43.27 99.7-43.26c9-3.89 14.81-12.84 14.81-22.81s-5.81-18.92-14.77-22.79L271.94 3.33c-10.1-4.44-21.71-4.45-31.87-.02L14.81 101.06C5.81 104.95 0 113.9 0 123.87s5.81 18.92 14.77 22.79l99.73 43.28-99.7 43.26C5.81 237.08 0 246.03 0 256.01c0 9.97 5.81 18.92 14.77 22.79l99.72 43.26-99.69 43.25C5.81 369.21 0 378.16 0 388.14c0 9.97 5.81 18.92 14.77 22.79l225.32 97.76a40.066 40.066 0 0 0 15.9 3.31c5.42 0 10.84-1.1 15.9-3.31l225.29-97.74c9-3.89 14.81-12.84 14.81-22.81 0-9.98-5.81-18.94-14.77-22.81l-99.72-43.26 99.69-43.25c9-3.89 14.81-12.84 14.81-22.81zM45.23 123.87l208.03-90.26.03-.02c1.74-.71 3.65-.76 5.45.02l208.03 90.26-208.03 90.27c-1.81.77-3.74.77-5.48 0L45.23 123.87zm421.54 264.27L258.74 478.4c-1.81.77-3.74.77-5.48 0L45.23 388.13l110.76-48.06 84.11 36.49a40.066 40.066 0 0 0 15.9 3.31c5.42 0 10.84-1.1 15.9-3.31l84.11-36.49 110.76 48.07zm-208.03-41.87c-1.81.77-3.74.77-5.48 0L45.23 256 156 207.94l84.1 36.5a40.066 40.066 0 0 0 15.9 3.31c5.42 0 10.84-1.1 15.9-3.31l84.1-36.49 110.77 48.07-208.03 90.25z"
        on:click={openNewBatch}>Create a Batch</EmptyState
      >
    </div>
  {:else}
    <!-- Projects table (small breakpoint and up) -->
    <table class="w-full max-w-full table-auto">
      <thead>
        <tr class="">
          <th
            class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center"
          >
            <div class="lg:pl-2 w-24">Status</div>
          </th>

          <th
            class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Assigment
          </th>
          <th
            class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            Configuration
          </th>
          <th
            class="px-6 py-3 border-b whitespace-nowrap border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center"
          >
            Game Count
          </th>
          <th
            class="pr-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            <div class="w-24" />
          </th>
          <th
            class="pr-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
          />
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-100">
        {#each $batches as batch}
          <BatchLine {batch} />
        {/each}
      </tbody>
    </table>
  {/if}
</Page>

<FetchTreatments let:treatments>
  <NewBatch bind:newBatch {treatments} />
</FetchTreatments>
