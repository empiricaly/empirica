<script>
  export let options;
  export let id = "";
  export let selected = null;
  export let placeholder = null;
  export let title = "";
  export let disabled = false;
  export let el = null;
  export let testId = "unnamedSelect";
</script>

<div class="relative">
  {#if !selected && placeholder}
    <span class="mt-0.25">{placeholder}</span>
  {/if}
  <select
    bind:this={el}
    {disabled}
    {id}
    name={id}
    bind:value={selected}
    data-test={testId}
    {title}
  >
    {#each options as option}
      <option value={option.value || option.label}>
        {option.label}
      </option>
    {/each}
  </select>
</div>

<style>
  select {
    @apply "overflow-ellipsis truncate block w-full pl-3 pr-10 py-2.25 text-base shadow-sm border border-gray-300 sm:text-sm rounded-md focus:outline-none focus:ring-empirica-500 focus:border-empirica-500";
  }
  span {
    @apply "block absolute pointer-events-none w-full pl-3 pr-10 py-2 text-base text-gray-400 sm:text-sm border border-transparent";
  }
</style>
