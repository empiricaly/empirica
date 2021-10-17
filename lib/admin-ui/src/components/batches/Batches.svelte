<script>
  import Page from "../common/Page.svelte";
  import BatchLine from "./BatchLine.svelte";
  import FetchTreatments from "./FetchTreatments.svelte";
  import NewBatch from "./NewBatch.svelte";

  let newBatch = false;

  const actions = [
    {
      label: "New Batch",
      onClick: () => (newBatch = true),
    },
  ];
</script>

<Page title="Batches" {actions}>
  <span slot="labels">
    Batches are groups of Games. You start Games through a Batch. Within a
    Batch, Games can be assigned differently depending on you Assignement
    Configuration. Start by creating a New Batch.
  </span>

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
        </tbody>
      </table>
    </div>
  </div>
</Page>

<FetchTreatments let:treatments>
  <NewBatch bind:newBatch {treatments} />
</FetchTreatments>
