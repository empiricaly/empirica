<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  export let customClass = "";
  export let primary = false;

  const base =
    "inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 whitespace-nowrap";
  const sec = "border-empirica-600 shadow-sm text-empirica-600 bg-transparent";
  const prim =
    "border-transparent shadow-sm text-white bg-empirica-600 hover:bg-empirica-700";
  let cn = `${base} ${primary ? prim : sec} ${customClass}`;

  function handleClick() {
    dispatch("click");
  }
</script>

<button on:click={handleClick} type="button" class={cn}>
  <slot />
</button>
