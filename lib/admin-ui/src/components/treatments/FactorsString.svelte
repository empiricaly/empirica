<script>
  export let factors;
</script>

{#each Object.keys(factors) as key, i}
  {#if factors[key] === Object(factors[key])}
    {#if factors[key].length}
      [{factors[key].join(", ")}]
    {:else}
      {"{"}
      {#each Object.keys(factors[key]) as k, j}
        {k}: {factors[key][k]}
        {#if j !== Object.keys(factors[key]).length - 1}
          ,
        {/if}
      {/each}
      {"}"}
    {/if}
  {:else}
    {key}: {factors[key]}
  {/if}
  {#if i !== Object.keys(factors).length - 1}
    {" | "}
  {/if}
{/each}
<!-- 
      // check for object/array type data
      if (val === Object(val)) {
        // Object
        if (!val.length) {
          let tempVal = [];
          for (const k in val) {
            tempVal.push(k + ": " + val[k]);
          }

          val = "{" + tempVal.join(", ") + "}";
        } else {
          // array object here
          val = "[" + val.join(", ") + "]";
        }
      }

      factorArr.push(key + ": " + val);
     -->
