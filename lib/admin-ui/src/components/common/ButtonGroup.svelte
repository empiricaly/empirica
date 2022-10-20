<script context="module">
  const shared =
    "relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-empirica-500 focus:border-empirica-500";
  const unselected = "text-gray-700 bg-white hover:bg-gray-50 border-gray-300";
  const selected =
    "text-gray-50 bg-empirica-500 hover:bg-empirica-500 border-empirica-500";
  const left = "rounded-l-md";
  const both = "rounded-md -ml-px";
  const middle = "-ml-px";
  const right = "-ml-px rounded-r-md";

  function pos(i, last) {
    if (i === 0) {
      if (i === last) {
        return both; // first and last (1 option)
      }

      return left; // first
    }

    if (i === last) {
      return right; // last
    }

    return middle; // somewhere in the middle
  }
</script>

<script>
  export let options;
  $: last = options.length - 1;
</script>

<span class="relative z-0 inline-flex shadow-sm rounded-md">
  {#each options as option, i}
    <button
      type="button"
      class="{shared} {option.selected ? selected : unselected} {pos(i, last)}"
      data-test={option.testId}
      on:click={option.onClick}
    >
      {option.label}
    </button>
  {/each}
</span>
