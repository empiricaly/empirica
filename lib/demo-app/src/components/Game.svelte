<script>
  import { Tajriba } from "@empirica/tajriba";

  const url = "http://localhost:4737/query";
  const taj = new Tajriba(url);

  export let key;

  let p, ident;
  async function register(id) {
    id = id.trim();
    if (!id) {
      return;
    }

    p = await taj.register(id);
    window.localStorage.setItem(key, id);

    p.currentStepsSub((step, err) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("current step", p.id, JSON.stringify(step, null, "  "));
    });

    console.log("step subbed");

    p.currentCoParticipants((p, err) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log(
        "new current co participant",
        p.id,
        JSON.stringify(p, null, "  ")
      );
    });

    console.log("participants subbed");

    p.dataUpdates((d, err) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("new data update", p.id, JSON.stringify(d, null, "  "));
    });

    console.log("data subbed");
  }

  function handleSubmit(event) {
    event.preventDefault();
    register(ident);
  }

  function clearP(event) {
    event.preventDefault();
    window.localStorage.setItem(key, "");
    ident = "";
    p = null;
  }

  ident = window.localStorage.getItem(key);
  if (ident) {
    register(ident);
  }

  $: console.log(p);
</script>

<div class="flex justify-center items-center flex-grow border">
  <div>
    {#if p}
      <h5>
        Hello, {ident}
        <button on:click={clearP} class="text-sm text-gray-300">Clear</button>
      </h5>
    {:else}
      <form on:submit={handleSubmit}>
        <input type="text" bind:value={ident} />
        <button type="submit">Enter</button>
      </form>
      <!-- else content here -->
    {/if}
  </div>
</div>

<style global lang="postcss">
  h5 {
    @apply text-center text-4xl;
  }
</style>
