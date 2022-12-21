<script>
  import { DEFAULT_FACTOR, ORIGIN } from "../../constants.js";
  import { castValue } from "../../utils/typeValue.js";
  import { focus } from "../../utils/use.js";
  import Button from "../common/Button.svelte";
  import Trash from "../common/Trash.svelte";
  import Alert from "../layout/Alert.svelte";
  import SlideOver from "../overlays/SlideOver.svelte";

  let newFactor = false;

  let selectedFactor = DEFAULT_FACTOR;
  let tempTreatments;
  let deleteIconIndex = -1;
  let alertModal = false;
  let editedIndex;

  // Get treatments from file
  fetch(ORIGIN + "/treatments")
    .then((response) => response.json())
    .then((data) => {
      treatments = data;
    })
    .catch((error) => {
      console.info(error);
    });

  async function writeFactorsToFile() {
    try {
      await fetch(ORIGIN + "/treatments", {
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

    if (editedIndex !== undefined && treatments?.factors) {
      treatments.factors = treatments.factors.filter(
        (_, i) => i !== editedIndex
      );
    }

    selectedFactor.values.forEach((v, i) => {
      selectedFactor.values[i].value = castValue(v.value);
    });

    if (!treatments) {
      treatments = {};
    }
    if (!treatments.factors) {
      treatments.factors = [];
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

    if (editedIndex === undefined && treatments?.factors) {
      const factor = treatments.factors.filter(
        (f) => f.name === selectedFactor.name
      );
      if (factor.length > 0) {
        msg = "Factor name already exist";
      }
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
  function showFactorEditor(
    f = { name: "", desc: "", values: [{ value: "" }] },
    index = undefined
  ) {
    editedIndex = index;
    newFactor = true;
    selectedFactor = f;
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
    alertModal = false;
    writeFactorsToFile();
  }
</script>

<div
  class="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6"
>
  <div>
    <h3 class="text-lg leading-6 font-medium text-gray-900">Factors</h3>
    <p class="max-w-4xl text-sm text-gray-500">
      Factors are the variables that make up Treatments. Each Factor has
      different Factor Values.
    </p>
  </div>

  <div class="mt-3 sm:mt-0 sm:ml-4">
    <Button on:click={() => showFactorEditor()}>New Factor</Button>
  </div>
</div>

<div class="bg-white shadow overflow-hidden sm:rounded-md">
  <ul class="divide-y divide-gray-200">
    {#if treatments && treatments.factors}
      {#each treatments.factors as f, i (f)}
        <li class="hover:bg-gray-50 px-4 py-4 flex items-center sm:px-8">
          <button
            type="button"
            on:click={() => showFactorEditor(f, i)}
            class="w-full focus:outline-none text-left"
          >
            <div
              class="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between"
            >
              <div class="truncate">
                <div class="flex text-sm">
                  <p class="font-medium text-empirica-600 truncate">
                    {f.name}
                  </p>
                </div>
                {#if f.desc}
                  <div class="flex text-sm">
                    <p class="font-normal text-gray-400 truncate">
                      {f.desc}
                    </p>
                  </div>
                {/if}
                <div class="flex">
                  <div class="flex items-center text-gray-500 text-sm pt-2">
                    <p>
                      {formatFactorsToString(f.values)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </button>
          <button
            type="button"
            class="focus:outline-none"
            on:click={() => {
              alertModal = true;
            }}><div class="h-5 w-5"><Trash /></div></button
          >
          {#if alertModal}
            <Alert
              title="Delete Factor"
              onCancel={() => {
                alertModal = false;
              }}
              desc="Are you sure want to delete this factor?"
              confirmText="Delete"
              onConfirm={() => handleDeleteFactor(i)}
            />
          {/if}
        </li>
      {/each}
    {:else}
      <div class="px-4 py-4 sm:px-8">
        No Factors yet.
        <button
          type="button"
          class="text-empirica-500"
          on:click={() => showFactorEditor()}
        >
          Create a Factor
        </button>
      </div>
    {/if}
  </ul>
</div>

<SlideOver custom disableBgCloseClick bind:open={newFactor}>
  <div class="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
    <div class="flex-1">
      <!-- Header -->
      <div class="px-4 py-6 bg-gray-50 sm:px-6">
        <div class="flex items-start justify-between space-x-3">
          <div class="space-y-1">
            <h2 class="text-lg font-medium text-gray-900" id="slide-over-title">
              {#if editedIndex !== undefined}
                Edit Factor
              {:else}
                New Factor
              {/if}
            </h2>
            <p class="text-sm text-gray-500">
              Get started by filling in the information below to {editedIndex !==
              undefined
                ? "edit your"
                : "create your new"}
              factor.
            </p>
          </div>
          <div class="h-7 flex items-center">
            <!-- <button
              type="button"
              class="text-gray-400 hover:text-gray-500"
              on:click={() => (newFactor = false)}
            >
              <span class="sr-only">Close panel</span>
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
            </button> -->
          </div>
        </div>
      </div>

      <!-- Divider container -->
      <div class="py-4 space-y-6 sm:py-0 sm:space-y-0 sm:divide-gray-200">
        <div
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:px-6 sm:py-3"
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
              use:focus
              bind:value={selectedFactor.name}
              id="name"
              name="name"
              class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
            />
          </div>
        </div>

        <div
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:px-6 sm:py-3"
        >
          <div class="flex justify-between col-span-2">
            <label for="email" class="block text-sm font-medium text-gray-700"
              >Description</label
            >
            <span class="text-sm text-gray-500">Optional</span>
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
          class="space-y-1 px-4 sm:space-y-0 sm:grid sm:gap-4 sm:px-6 sm:py-3"
        >
          <p
            class="block text-sm font-medium col-span-2 text-gray-900 sm:mt-px sm:pt-2"
          >
            Values
          </p>
          {#if selectedFactor.values}
            {#each selectedFactor.values as v, index}
              <div
                class="values space-y-1 sm:space-y-0 sm:grid sm:gap-4 sm:py-1 sm:col-span-2"
                on:focus={() => {
                  deleteIconIndex = index;
                }}
                on:blur={() => {
                  deleteIconIndex = undefined;
                }}
                on:mouseover={() => {
                  deleteIconIndex = index;
                }}
                on:mouseout={() => {
                  console.log("hah");
                  deleteIconIndex = undefined;
                }}
              >
                <input
                  id={Date.now().toString()}
                  name="value"
                  on:keypress={(e) => {
                    if (e.keyCode !== 13) {
                      return;
                    }

                    addValue();
                  }}
                  bind:value={v.value}
                  type="text"
                  class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
                />
                {#if deleteIconIndex === index}
                  <button
                    type="button"
                    class="focus:outline-none"
                    on:click={(e) => {
                      e.preventDefault();
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
            on:click={saveFactor}
            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</SlideOver>

<style>
  .values {
    grid-template-columns: 1fr 30px;
  }
</style>
