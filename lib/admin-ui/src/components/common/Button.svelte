<script>
  export let customClass = "";
  export let primary = false;
  export let kind = "button";
  export let small = false;
  export let mini = false;
  export let color = "empirica";

  let size = "px-4 py-2 text-sm rounded-md";
  if (small) {
    size = "px-3 py-2 text-sm rounded-md";
  } else if (mini) {
    size = "px-2 py-1 text-xs rounded";
  }

  const base = `inline-flex items-center ${size} border font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 whitespace-nowrap`;
  const sec = `border-${color}-600 shadow-sm text-${color}-600 bg-transparent`;
  const prim = `border-transparent shadow-sm text-white bg-${color}-600 hover:bg-${color}-700`;
  let cn = `${base} ${primary ? prim : sec} ${customClass}`;
</script>

<button on:click type={kind} class={cn}>
  <slot />
</button>
