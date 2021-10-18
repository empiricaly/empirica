<script>
  import Button from "./Button.svelte";

  export let title;
  export let labels = [];
  export let actions = [];
</script>

<div
  class="pt-4 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between"
>
  <div class=" flex-1 min-w-0">
    <h2
      class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate"
    >
      {title}
    </h2>
    <div
      class="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6"
    >
      {#each labels as label}
        <div class="mt-2 flex items-center text-sm text-gray-500">
          <svg
            class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 {label.svgWidth || 512} 512"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d={label.svgPath} />
          </svg>

          {label.title}
        </div>
      {/each}

      <slot name="labels" />
    </div>
  </div>
  <div class="mt-5 flex lg:mt-0 lg:ml-4">
    {#each actions as action}
      <Button
        primary={action.primary}
        on:click={action.onClick ? action.onClick : () => {}}
        kind={action.submit ? "submit" : "button"}
      >
        {action.label}
      </Button>
    {/each}
  </div>
</div>

<div class="px-4 sm:px-6 lg:px-8 pt-4 mt-8">
  <slot />
</div>
