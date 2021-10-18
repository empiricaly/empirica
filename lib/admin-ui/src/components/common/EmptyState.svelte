<script>
  export let svgPath = "";
  export let svgWidth = 512;
</script>

<button
  type="button"
  class="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  on:click
>
  <slot name="svg">
    {#if svgPath}
      <svg
        class="mx-auto text-gray-400 h-12 w-12"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 {svgWidth} 512"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={svgPath} />
      </svg>
    {/if}
  </slot>
  <span class="mt-3 block text-sm font-medium text-gray-900">
    <slot />
  </span>
</button>
