<script>
  import { DEFAULT_TREATMENT, URL } from "../../constants";
  import { focus } from "../../utils/use";
  import { castValue } from "../../utils/typeValue";
  import Button from "../common/Button.svelte";
  import Duplicate from "../common/duplicate.svelte";
  import Trash from "../common/Trash.svelte";
  import Alert from "../layout/Alert.svelte";
  import SlideOver from "../overlays/SlideOver.svelte";
  import FactorsString from "./FactorsString.svelte";

  let newTreatment = false;
  let tempTreatments;

  let selectedTreatment = DEFAULT_TREATMENT;
  let alertModal = false;
  let editedIndex;
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

  function getFactors(factorName) {
    if (!treatments) {
      return [];
    }

    const factor = treatments?.factors?.find((f) => f.name === factorName);
    return factor ? factor.values.map((f) => f.value) : [];
  }

  function validateTreatment() {
    let msg;

    if (!selectedTreatment.name) {
      msg = "Name cannot be empty";
    }

    if (editedIndex === undefined) {
      const treatment = treatments.treatments.filter(
        (t) => t.name === selectedTreatment.name
      );

      if (treatment.length > 0) {
        msg = "Treatment name already exist";
      }
    }

    if (!selectedTreatment.factors || selectedTreatment.factors.length === 0) {
      msg = "Factors cannot be empty";
    }

    selectedTreatment.factors = selectedTreatment.factors.filter(
      (f) =>
        f.key !== "" &&
        f.key !== null &&
        f.key !== undefined &&
        f.value !== null &&
        f.value !== undefined
    );

    for (let i = 0; i < selectedTreatment.factors.length; i++) {
      for (let j = 0; j < selectedTreatment.factors.length; j++) {
        if (i === j) {
          continue;
        }

        let iVal = selectedTreatment.factors[i];
        let jVal = selectedTreatment.factors[j];

        if (iVal.key === jVal.key) {
          msg = "All factors key must be unique";
          break;
        }
      }
    }

    return msg;
  }

  function saveTreatment(e) {
    e.preventDefault();
    tempTreatments = treatments;
    let msg = validateTreatment();

    if (msg) {
      alert(msg);
      return;
    }

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

      treatment.factors[f.key] = castValue(f.value);
    }

    checkNewFactors(treatment.factors);

    if (editedIndex !== undefined) {
      treatments.treatments = treatments.treatments.filter(
        (_, i) => i !== editedIndex
      );
    }

    treatments.treatments.push(treatment);
    writeTreatmentsToFile();
    newTreatment = false;
    treatments = treatments;
  }

  function checkNewFactors(factors) {
    let currentFactors = treatments.factors;

    //  Inital empty factors
    if (!currentFactors || currentFactors.length === 0) {
      treatments.factors = [];
      for (const fKey in factors) {
        treatments.factors.push({
          name: fKey,
          values: [{ value: factors[fKey] }],
        });
      }
      return;
    }

    // Factors exist
    for (const fKey in factors) {
      let factor = currentFactors.find((f) => f.name === fKey);

      // Add to new factors
      if (!factor) {
        treatments.factors.push({
          name: fKey,
          values: [{ value: factors[fKey] }],
        });
        continue;
      }

      let value = factor.values.find((v) => v.value === factors[fKey]);

      if (value) {
        continue;
      }

      // Add new value to existing factor
      value = factors[fKey];
      factor.values.push({ value });
      treatments.factors = treatments.factors.filter(
        (f) => f.name !== factor.name
      );
      treatments.factors.push(factor);
    }
  }

  let treatments;
  function showTreatmentEditor(_, t, index = undefined) {
    newTreatment = true;
    editedIndex = index;

    if (!t) {
      let factors = treatments?.factors?.map((f) => ({
        key: f.name,
        value: "",
      }));
      if (!factors) {
        factors = [{ key: "", value: "" }];
      }

      selectedTreatment = {
        name: "",
        desc: "",
        factors,
      };

      return;
    }

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

  function addProperty() {
    if (!selectedTreatment.factors) {
      selectedTreatment.factors = [];
    }

    // @ts-ignore
    selectedTreatment.factors.push({ key: "", value: "" });
    selectedTreatment = selectedTreatment;
  }

  function handleDeleteTreatment(treatment) {
    tempTreatments = treatments;
    treatments.treatments = treatments.treatments.filter(
      (t) => treatment.name !== t.name
    );
    alertModal = false;
    writeTreatmentsToFile();
  }

  // $: console.info("treatments ", treatments);
</script>

<div
  class="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6"
>
  <div>
    <h3 class="text-lg leading-6 font-medium text-gray-900">Treatments</h3>
    <p class="max-w-4xl text-sm text-gray-500">
      Treatments are a set of variables used to configure a game.
    </p>
  </div>

  <div class="mt-3 sm:mt-0 sm:ml-4">
    <Button on:click={showTreatmentEditor}>New Treatment</Button>
  </div>
</div>

<div class="bg-white shadow overflow-hidden sm:rounded-md">
  <ul role="list" class="divide-y divide-gray-200">
    {#if treatments && treatments.treatments}
      {#each treatments.treatments as t, i (t)}
        <li class="hover:bg-gray-50">
          <div class="px-4 py-4 flex items-center sm:px-8">
            <button
              type="button"
              on:click={() => showTreatmentEditor(null, t, i)}
              class="w-full min-w-0 text-sm focus:outline-none text-left"
            >
              <p class="font-medium text-empirica-600 truncate">
                {t.name}
              </p>
              {#if t.desc}
                <p class="font-normal text-gray-400 truncate">
                  {t.desc}
                </p>
              {/if}
              <div class="text-gray-500 pt-1">
                <FactorsString factors={t.factors} />
              </div>
            </button>

            <div class="flex">
              <button
                type="button"
                class="focus:outline-none"
                on:click={() => showTreatmentEditor(null, t)}
              >
                <div class="h-5 w-5"><Duplicate /></div>
              </button>
              <button
                type="button"
                class="ml-2 focus:outline-none"
                on:click={() => {
                  alertModal = true;
                }}
              >
                <div class="h-5 w-5"><Trash /></div>
              </button>
              {#if alertModal}
                <Alert
                  title="Delete Treatment"
                  onCancel={() => {
                    alertModal = false;
                  }}
                  desc="Are you sure want to delete this treatment?"
                  confirmText="Delete"
                  onConfirm={() => handleDeleteTreatment(t)}
                />
              {/if}
            </div>
          </div>
        </li>
      {/each}
    {:else}
      <div class="px-4 py-4 sm:px-8">
        No treatments yet.
        <button
          type="button"
          class="text-empirica-500"
          on:click={showTreatmentEditor}
        >
          Create a Treatment
        </button>
      </div>
    {/if}
  </ul>
</div>

<SlideOver custom disableBgCloseClick bind:open={newTreatment}>
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
              {#if editedIndex !== undefined}
                Edit Treatment
              {:else}
                New Treatment
              {/if}
            </h2>
            <p class="text-sm text-gray-500">
              Get started by filling in the information below to {editedIndex !==
              undefined
                ? "edit your"
                : "create your new"}
              treatment.
            </p>
          </div>
          <div class="h-7 flex items-center">
            <!-- <button
              type="button"
              class="text-gray-400 hover:text-gray-500"
              on:click={() => (newTreatment = false)}
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
              bind:value={selectedTreatment.name}
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
              bind:value={selectedTreatment.desc}
              id="description"
              name="description"
              rows="3"
              class="block w-full px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
            />
          </div>
        </div>

        <!-- Factor List -->
        <div
          class="factors space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-2 sm:px-6 sm:py-3"
        >
          {#if selectedTreatment?.factors?.length > 0}
            <p
              class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2 col-span-2"
            >
              Factor
            </p>
            <p
              class="block text-sm font-medium text-gray-900 sm:mt-px sm:pt-2 col-span-3"
            >
              Value
            </p>
          {/if}

          {#if selectedTreatment.factors}
            {#each selectedTreatment.factors as f, index (f)}
              <div
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
                  deleteIconIndex = undefined;
                }}
                class="factors space-y-1 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-2 sm:py-1 sm:col-span-5"
              >
                <input
                  bind:value={f.key}
                  type="text"
                  class="block w-full h-9 px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
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
                  bind:value={f.value}
                  type="text"
                  class="block w-full h-9 px-3 py-2 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-empirica-500 focus:border-transparent border border-transaparent rounded-md"
                />
                {#if deleteIconIndex === index}
                  <button
                    type="button"
                    on:click={(e) => {
                      e.preventDefault();
                      selectedTreatment.factors =
                        selectedTreatment.factors.filter((_, i) => i !== index);
                    }}
                  >
                    <div class="h-4 w-4"><Trash /></div>
                  </button>
                {:else}
                  <div />
                {/if}

                {#if getFactors(f.key).length > 0}
                  <div>
                    {#each getFactors(f.key) as v, i (v)}
                      <button
                        type="button"
                        on:click={(e) => {
                          e.preventDefault();
                          f.value = v;
                        }}
                      >
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1"
                        >
                          {v}
                        </span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}

          <div class="sm:col-span-2 pt-4">
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

<style>
  .factors {
    grid-template-columns: 1fr 15px 1fr 15px 1fr;
  }
</style>
