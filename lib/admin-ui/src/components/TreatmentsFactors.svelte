<script>
  import Treatments from "./Treatments.svelte";
  import Factors from "./Factors.svelte";
</script>

<main
  class="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-gray-100"
>
  <div
    class="border-b border-gray-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8"
  >
    <div class="flex-1 min-w-0">
      <h1 class="text-lg font-medium leading-6 text-gray-900 sm:truncate mb-2">
        Treatments And Factors
      </h1>
      <p class="text-sm font-small text-gray-500 sm:truncate">
        Here you can edit your treatments.yaml file. Updates are auto-saved
        continuously.
      </p>
    </div>
  </div>

  <Treatments />
  <div class="mt-8"><Factors /></div>
</main>
