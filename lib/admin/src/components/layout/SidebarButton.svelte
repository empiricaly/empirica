<script>
  import { link } from "svelte-spa-router";
  import active from "svelte-spa-router/active";

  export let path;
  export let label;
  export let svgPath = "";
  export let svgWidth = 512;
</script>

<a
  href={path}
  use:link
  use:active
  class="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
>
  <slot>
    {#if svgPath}
      <svg
        class="text-gray-300 mr-3 flex-shrink-0 h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 {svgWidth} 512"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={svgPath} />
      </svg>
    {/if}
  </slot>
  <span class="flex-1"> {label} </span>
</a>

<style lang="postcss">
  :global(a.active) {
    @apply bg-gray-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md;
  }
  :global(a.active:hover) {
    @apply bg-gray-900;
  }
</style>
