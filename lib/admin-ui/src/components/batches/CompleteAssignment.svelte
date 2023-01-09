<script>
  import { deepEqual } from "../../utils/equal.js";
  import { formatFactorsToString } from "../../utils/treatments.js";
  import Input from "../common/Input.svelte";
  import LabelBox from "../common/LabelBox.svelte";
  import Select from "../common/Select.svelte";
  import Trash from "../common/Trash.svelte";

  export let treatments = [];
  export let config = [];

  let newTreatment;
  let newTreatmentSelect;

  $: remaining = treatments
    .filter((t) => !config.some((tt) => deepEqual(tt.treatment, t)))
    .sort((t, tt) => (t.name.toUpperCase() > tt.name.toUpperCase() ? 1 : -1));

  $: {
    if (newTreatment) {
      config.push({
        treatment: newTreatment,
        count: 1,
      });
      config = config;
      newTreatment = null;
      if (treatments.length === config.length && newTreatmentSelect) {
        newTreatmentSelect.blur();
      }
    }
  }

  function remove(conf) {
    return function () {
      config = config.filter((t) => t !== conf);
    };
  }
</script>

<LabelBox label="Treatments">
  {#each config as conf}
    <div class="line" data-test="treatmentLine">
      <div title={formatFactorsToString(conf.treatment.factors, "\n")}>
        <Select
          bind:selected={conf.treatment}
          testId="treatmentSelect"
          options={[conf.treatment]
            .concat(remaining)
            .map((t) => ({ label: t.name, value: t }))}
        />
        <!-- <div class="text-sm mt-1 text-gray-400 truncate overflow-ellipsis">
          <FactorsString factors={conf.treatment.factors} />
        </div> -->
      </div>
      <div>
        <Input
          type="number"
          suffix={conf.count === 1 ? "game" : "games"}
          placeholder="0"
          right
          testId="gameCountInput"
          bind:value={conf.count}
        />
      </div>
      <div class="flex items-center">
        <button
          type="button"
          on:click={remove(conf)}
          data-test="trashButton"
          class="w-6 h-6"
        >
          <Trash />
        </button>
      </div>
    </div>
  {/each}
  <div
    class="max-w-xs {config.length > 0 ? 'pt-4' : ''} {remaining.length === 0
      ? 'opacity-50'
      : ''}"
    data-test="newTreatmentLine"
  >
    <Select
      disabled={remaining.length === 0}
      placeholder={remaining.length > 0
        ? "Add Treatment"
        : "No treatments left"}
      bind:selected={newTreatment}
      options={remaining.map((t) => ({ label: t.name, value: t }))}
      bind:el={newTreatmentSelect}
      testId="treatmentSelect"
    />
  </div>
</LabelBox>

<style>
  .line {
    @apply mb-3 grid gap-3 items-center;
    grid-template-columns: 3fr 1fr 64px;
  }
</style>
