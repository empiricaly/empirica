<script>
  export let id = "";
  export let placeholder = "";
  export let prefix = null;
  export let suffix = null;
  export let title = "";
  export let value = "";
  export let type = "text";
  export let right = false;
  export let testId = "unnamedInput";
</script>

<div
  class="flex rounded-md shadow-sm border border-gray-300 focus:outline-none ring-1 ring-transparent focus-within:ring-empirica-500 focus-within:border-empirica-500"
>
  {#if prefix}
    <div class="inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span class="text-gray-500 sm:text-sm"> {prefix} </span>
    </div>
  {/if}
  {#if type === "text"}
    <input {title} data-test={testId} bind:value type="text" name={id} {id} {placeholder} />
  {:else if type === "number"}
    <input
      {title}
      bind:value
      type="number"
      name={id}
      {id}
      {placeholder}
      data-test={testId}
      class="number-arrows-none {right ? 'text-right' : ''}"
    />
  {:else}
    Type not implemented ('{type}')
  {/if}
  {#if suffix}
    <div class=" inset-y-0 pr-3 flex items-center pointer-events-none">
      <span class="text-gray-500 sm:text-sm">
        {suffix}
      </span>
    </div>
  {/if}
</div>

<style>
  input {
    @apply "block w-full placeholder-gray-400 text-gray-900 sm:text-sm bg-transparent border-transparent focus:border-transparent focus:ring-transparent";
  }
</style>
