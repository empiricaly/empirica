<script>
  import Treatments from "./Treatments.svelte";
  import Factors from "./Factors.svelte";
</script>

<main
  class="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-gray-100"
>
  <div
    class="md:flex md:items-center md:justify-between px-4 py-4 sm:px-6 lg:px-8"
  >
    <div class="flex-1 min-w-0">
      <h2
        class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate"
      >
        Treatments And Factors
      </h2>
      <p class="text-sm font-small text-gray-500 sm:truncate">
        Here you can edit your treatments.yaml file. Updates are auto-saved
        continuously.
      </p>
    </div>
  </div>

  <div class="max-w-7xl px-4 sm:px-6 lg:px-8">
    <Treatments />
    <div class="mt-8"><Factors /></div>
  </div>
</main>
