<script>
  export let customClass = "";
  export let primary = false;
  export let kind = "button";

  const base =
    "inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 whitespace-nowrap";
  const sec = "border-empirica-600 shadow-sm text-empirica-600 bg-transparent";
  const prim =
    "border-transparent shadow-sm text-white bg-empirica-600 hover:bg-empirica-700";
  let cn = `${base} ${primary ? prim : sec} ${customClass}`;
</script>

<button on:click type={kind} class={cn}>
  <slot />
</button>
