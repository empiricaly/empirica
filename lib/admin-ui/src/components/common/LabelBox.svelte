<script>
  export let forID = "";
  export let label;
  export let short = false;
</script>

<div class={short ? "sm:col-span-4" : "sm:col-span-6"}>
  <label for={forID} class="block text-sm font-medium text-gray-700">
    {label}
  </label>
  <div class="mt-1 ">
    <slot />
  </div>
</div>
