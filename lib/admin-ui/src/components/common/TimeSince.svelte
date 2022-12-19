<script>
  import { onMount } from "svelte";
  import { timeAgo } from "../../utils/time.js";

  export let time;

  $: formattedTime = timeAgo(time);

  onMount(() => {
    const interval = setInterval(() => {
      formattedTime = timeAgo(time);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<time datetime={time.toISOString()} title={time.toLocaleString()}
  >{formattedTime}</time
>
