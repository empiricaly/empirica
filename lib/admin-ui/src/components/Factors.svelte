<script>
  import { DEFAULT_FACTOR, URL } from "../constants";

  import Button from "./common/Button.svelte";
  import Trash from "./common/Trash.svelte";
  import SlideOver from "./overlays/SlideOver.svelte";

  let newFactor = false;

  $: selectedFactor = DEFAULT_FACTOR;
  let tempTreatments;
  let deleteIconIndex = -1;

  // Get treatments from file
  $: {
    fetch(URL + "/treatments")
      .then((response) => response.json())
      .then((data) => {
        treatments = data;
      })
      .catch((error) => {
        console.info(error);
      });
  }

  async function writeFactorsToFile() {
    try {
      await fetch(URL + "/treatments", {
        method: "PUT",
        body: JSON.stringify(treatments),
      });
    } catch (error) {
      treatments = tempTreatments;
      alert("Failed to write factors to treatments.yaml file");
      console.error("write factors file", error);
    }
  }

  async function saveFactor(e) {
    e.preventDefault();
    tempTreatments = treatments;
    let msg = validateFactor();
    if (msg) {
      alert(msg);
      return;
    }

    treatments.factors.push(selectedFactor);

    treatments = treatments;
    selectedFactor = DEFAULT_FACTOR;
    newFactor = false;
    writeFactorsToFile();
  }

  function validateFactor() {
    let msg;

    if (!selectedFactor.name) {
      msg = "Name cannot be empty";
    }
    if (!selectedFactor.values || selectedFactor.values.length === 0) {
      msg = "Values cannot be empty";
    }

    const factor = treatments.factors.filter(
      (f) => f.name === selectedFactor.name
    );
    if (factor.length > 0) {
      msg = "Factor name alrady exist";
    }

    selectedFactor.values = selectedFactor.values.filter(
      (f) => f.value !== "" && f.value !== null && f.value !== undefined
    );

    for (let i = 0; i < selectedFactor.values.length; i++) {
      for (let j = 0; j < selectedFactor.values.length; j++) {
        if (i === j) {
          continue;
        }

        let iVal = selectedFactor.values[i];
        let jVal = selectedFactor.values[j];

        if (iVal === jVal) {
          msg = "All factor values must be unique";
          break;
        }
      }
    }

    return msg;
  }

  let treatments;
  function showFactorEditor() {
    newFactor = true;
    // if (t) {
    //   selectedFactor = { name: t.name, desc: t.desc, factors: [] };
    //   for (const key in t.factors) {
    //     let val = t.factors[key];
    //     if (val === Object(val)) {
    //       // Object
    //       if (!val.length) {
    //         let tempVal = [];
    //         for (const k in val) {
    //           tempVal.push(k + ": " + val[k]);
    //         }

    //         val = "{" + tempVal.join(", ") + "}";
    //       } else {
    //         // array object here
    //         val = "[" + val.join(", ") + "]";
    //       }
    //     }
    //     selectedFactor.factors.push({ key: key, value: val });
    //   }
    // }
  }

  function init(el) {
    el.focus();
  }

  function addValue() {
    if (!selectedFactor.values) {
      selectedFactor.values = [];
    }

    // @ts-ignore
    selectedFactor.values.push({ value: "" });
    selectedFactor = selectedFactor;
  }

  function formatFactorsToString(factors) {
    let factorArr = [];
    for (const f of factors) {
      factorArr.push(f.value);
    }

    return factorArr.sort((a, b) => a - b).join(", ");
  }

  function handleDeleteFactor(index) {
    tempTreatments = treatments;
    treatments.factors = treatments.factors.filter((_, i) => i !== index);
    writeFactorsToFile();
  }
</script>

<div class="bg-gray-100">
  <div class="w-full mx-auto py-4 px-8 lg:flex lg:justify-between">
    <div class="w-full">
      <h2 class="text-lg text-gray-900 sm:tracking-tight">Factors</h2>
      <p class="mt-2 text-sm text-gray-400">
        Factors are the variables that make up Treatments. Each Factor has
        different Factor Values.
      </p>
    </div>
    <div class="mt-5 w-full max-w-xs">
      <Button on:click={showFactorEditor}>New Factor</Button>
    </div>
  </div>
</div>

<div class="bg-white mx-8 shadow overflow-hidden sm:rounded-md">
  <ul role="list" class="divide-y divide-gray-200">
    {#if treatments && treatments.factors}
      {#each treatments.factors as f, i (f)}
        <li>
          <div class="px-4 py-4 flex items-center sm:px-8">
            <div
              class="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between"
            >
              <div class="truncate">
                <div class="flex text-sm">
                  <p class="font-medium text-indigo-600 truncate">
                    {f.name}
                  </p>
                </div>
                {#if f.desc}
                  <div class="flex text-sm">
                    <p class="font-medium truncate">
                      {f.desc}
                    </p>
                  </div>
                {/if}
                <div class="flex">
                  <div class="flex items-center text-indigo-600 text-sm">
                    <p>
                      {formatFactorsToString(f.values)}
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-4">
                <div class="grid grid-cols-2 gap-6">
                  <button on:click={() => handleDeleteFactor(i)}
                    ><div class="h-5 w-5"><Trash /></div></button
                  >
                </div>
              </div>
            </div>
          </div>
        </li>
      {/each}
    {:else}
      <p>No Factor</p>
    {/if}
  </ul>
</div>

<SlideOver custom bind:open={newFactor}>
  <form
    class="h-full flex flex-col bg-white shadow-xl overflow-y-scroll"
    on:submit={saveFactor}
  >
    <div class="flex-1">
      <!-- Header -->
      <div class="px-4 py-6 bg-gray-50 sm:px-6">
        <div class="flex items-start justify-between space-x-3">
          <div class="space-y-1">
            <h2 class="text-lg font-medium text-gray-900" id="slide-over-title">
              New Factor
            </h2>
            <p class="text-sm text-gray-500">
              Get started by filling in the information below to create your new
              factor.
            </p>
          </div>
          <div class="h-7 flex items-center">
            <button
              type="button"
              class="text-gray-400 hover:text-gray-500"
              on:click={() => (newFactor = false)}
            >
              <span class="sr-only">Close panel</span>
              <!-- Heroicon name: outline/x -->
              <svg
                class="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Divider container -->
      <div class="py-4 space-y-6 sm:py-0 sm:space-y-0 sm:divide-gray-200">
        <div
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 sm:py-3"
        >
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2"
            >
              Name
            </label>
          </div>
          <div class="sm:col-span-2">
            <input
              use:init
              bind:value={selectedFactor.name}
              id="name"
              name="name"
              class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
            />
          </div>
        </div>

        <div
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 sm:py-3"
        >
          <div>
            <label
              for="description"
              class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2"
            >
              Description (Optional)
            </label>
          </div>
          <div class="sm:col-span-2">
            <textarea
              bind:value={selectedFactor.desc}
              id="description"
              name="description"
              rows="3"
              class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
            />
          </div>
        </div>

        <div
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-6 sm:py-3"
        >
          <p
            class="block text-sm font-medium col-span-2 text-gray-900 sm:mt-px sm:pt-2"
          >
            Values
          </p>
          {#if selectedFactor.values}
            {#each selectedFactor.values as v, index}
              <div
                class="space-y-1 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:py-1 sm:col-span-2"
              >
                <input
                  bind:value={v.value}
                  on:focus={() => {
                    deleteIconIndex = index;
                  }}
                  type="text"
                  class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
                />
                {#if deleteIconIndex === index}
                  <button
                    on:click={(e) => {
                      e.preventDefault;
                      selectedFactor.values = selectedFactor.values.filter(
                        (_, i) => i !== index
                      );
                    }}
                  >
                    <div class="h-4 w-4"><Trash /></div>
                  </button>
                {/if}
              </div>
            {/each}
          {/if}
          <div class="sm:col-span-2">
            <Button on:click={addValue}>Add Value</Button>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex-shrink-0 px-4 border-t border-gray-200 py-5 sm:px-6">
        <div class="space-x-3 flex justify-end">
          <button
            type="button"
            class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
            on:click={() => (newFactor = false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </form>
</SlideOver>
