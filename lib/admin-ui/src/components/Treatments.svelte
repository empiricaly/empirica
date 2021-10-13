<script>
  import { DEFAULT_TREATMENT, URL } from "../constants";

  import Button from "./common/Button.svelte";
  import Duplicate from "./common/duplicate.svelte";
  import Trash from "./common/Trash.svelte";
  import Factors from "./Factors.svelte";
  import SlideOver from "./overlays/SlideOver.svelte";

  let newTreatment = false;
  let tempTreatments;

  $: selectedTreatment = DEFAULT_TREATMENT;
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

  async function writeTreatmentsToFile() {
    try {
      await fetch(URL + "/treatments", {
        method: "PUT",
        body: JSON.stringify(treatments),
      });
    } catch (error) {
      treatments = tempTreatments;
      alert("Failed to write treatments to treatments.yaml file");
      console.error("write treatments file", error);
    }
  }

  function saveTreatment(e) {
    e.preventDefault();
    tempTreatments = treatments;
    let treatment = {
      name: selectedTreatment.name,
      desc: selectedTreatment.desc,
      factors: {},
    };

    for (let i = 0; i < selectedTreatment.factors.length; i++) {
      const f = selectedTreatment.factors[i];
      if (!f.key || !f.value) {
        continue;
      }

      treatment.factors[f.key] = f.value;
    }

    treatments.treatments.push(treatment);
    writeTreatmentsToFile();
    newTreatment = false;
    treatments = treatments;
  }

  let treatments;
  function showTreatmentEditor(t) {
    newTreatment = true;
    if (t) {
      selectedTreatment = { name: t.name, desc: t.desc, factors: [] };
      for (const key in t.factors) {
        let val = t.factors[key];
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
        selectedTreatment.factors.push({ key: key, value: val });
      }
    }
  }

  function init(el) {
    el.focus();
  }

  function addProperty() {
    if (!selectedTreatment.factors) {
      selectedTreatment.factors = [];
    }

    // @ts-ignore
    selectedTreatment.factors.push({ key: "", value: "" });
    selectedTreatment = selectedTreatment;
  }

  function formatFactorsToString(factors) {
    let factorArr = [];
    for (const key in factors) {
      let val = factors[key];

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
    }

    return factorArr.join(" | ");
  }

  function handleDeleteTreatment(treatment) {
    tempTreatments = treatments;
    treatments.treatments = treatments.treatments.filter(
      (t) => treatment.name !== t.name
    );
    writeTreatmentsToFile();
  }

  // $: console.info("treatments ", treatments);
</script>

<div class="bg-gray-100">
  <div class="w-full mx-auto py-4 px-8 lg:flex lg:justify-between">
    <div class="w-full">
      <h2 class="text-lg text-gray-900 sm:tracking-tight">Treatments</h2>
      <p class="mt-2 text-sm text-gray-400">
        Treatments are a set of variables used to configure a game.
      </p>
    </div>
    <div class="mt-5 w-full max-w-xs">
      <Button on:click={showTreatmentEditor}>New Treatment</Button>
    </div>
  </div>
</div>

<div class="bg-white mx-8 shadow overflow-hidden sm:rounded-md">
  <ul role="list" class="divide-y divide-gray-200">
    {#if treatments && treatments.treatments}
      {#each treatments.treatments as t, i (t)}
        <li>
          <div class="px-4 py-4 flex items-center sm:px-8">
            <div
              class="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between"
            >
              <div class="truncate">
                <div class="flex text-sm">
                  <p class="font-medium text-indigo-600 truncate">
                    {t.name}
                  </p>
                </div>
                <div class="mt-2 flex">
                  <div class="flex items-center text-sm text-gray-500">
                    <p>
                      {formatFactorsToString(t.factors)}
                    </p>
                  </div>
                </div>
              </div>
              <div class="mt-4">
                <div class="grid grid-cols-2 gap-6">
                  <button on:click={() => showTreatmentEditor(t)}
                    ><div class="h-4 w-4"><Duplicate /></div></button
                  >
                  <button on:click={() => handleDeleteTreatment(t)}
                    ><div class="h-5 w-5"><Trash /></div></button
                  >
                </div>
              </div>
            </div>
          </div>
        </li>
      {/each}
    {:else}
      <p>No Treatment</p>
    {/if}
  </ul>
</div>

<SlideOver custom bind:open={newTreatment}>
  <form
    class="h-full flex flex-col bg-white shadow-xl overflow-y-scroll"
    on:submit={saveTreatment}
  >
    <div class="flex-1">
      <!-- Header -->
      <div class="px-4 py-6 bg-gray-50 sm:px-6">
        <div class="flex items-start justify-between space-x-3">
          <div class="space-y-1">
            <h2 class="text-lg font-medium text-gray-900" id="slide-over-title">
              New Treatment
            </h2>
            <p class="text-sm text-gray-500">
              Get started by filling in the information below to create your new
              treatment.
            </p>
          </div>
          <div class="h-7 flex items-center">
            <button
              type="button"
              class="text-gray-400 hover:text-gray-500"
              on:click={() => (newTreatment = false)}
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
              bind:value={selectedTreatment.name}
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
              bind:value={selectedTreatment.desc}
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
          <p class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2">
            Factor
          </p>
          <p class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2 ">
            Value
          </p>
          {#if selectedTreatment.factors}
            {#each selectedTreatment.factors as f, index (f)}
              <div
                class="space-y-1 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:py-1 sm:col-span-2"
              >
                <input
                  bind:value={f.key}
                  type="text"
                  class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
                />
                <div class="h-4 w-4 pt-2">
                  <svg
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 28 33"
                  >
                    <defs />
                    <path
                      d="M2.51554.661453L17.9083 16.0469c.3427.3427.3427.8968 0 1.2396L2.51554 32.6719c-.3427.3427-.89687.3427-1.23958 0l-.517708-.5177c-.342708-.3427-.342708-.8969 0-1.2396L15.0135 16.6667.765544 2.41145c-.342709-.3427-.342709-.89687 0-1.23958L1.28325.654162c.33542-.335417.88959-.335417 1.23229.007291zm8.09376 0l-.5177.517707c-.34272.34271-.34272.89688 0 1.23959L24.3468 16.6667 10.0989 30.9219c-.34273.3427-.34273.8968 0 1.2396l.5177.5177c.3427.3427.8969.3427 1.2396 0l15.3927-15.3855c.3427-.3427.3427-.8968 0-1.2395L11.8562.668745c-.35-.35-.9042-.35-1.2469-.007292z"
                      fill="#D1D5DB"
                    />
                  </svg>
                </div>
                <input
                  on:focus={() => {
                    deleteIconIndex = index;
                  }}
                  bind:value={f.value}
                  type="text"
                  class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
                />
                {#if deleteIconIndex === index}
                  <button
                    on:click={(e) => {
                      e.preventDefault;
                      selectedTreatment.factors =
                        selectedTreatment.factors.filter((_, i) => i !== index);
                    }}
                  >
                    <div class="h-4 w-4"><Trash /></div>
                  </button>
                {/if}
              </div>
            {/each}
          {/if}
          <div class="sm:col-span-2">
            <Button on:click={addProperty}>Add Property</Button>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex-shrink-0 px-4 border-t border-gray-200 py-5 sm:px-6">
        <div class="space-x-3 flex justify-end">
          <button
            type="button"
            class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
            on:click={() => (newTreatment = false)}
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
