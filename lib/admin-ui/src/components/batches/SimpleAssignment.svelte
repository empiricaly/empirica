<script>
  import { deepEqual } from "../../utils/equal";
  import { formatFactorsToString } from "../../utils/treatments";
  import Input from "../common/Input.svelte";
  import LabelBox from "../common/LabelBox.svelte";
  import Select from "../common/Select.svelte";
  import Trash from "../common/Trash.svelte";

  export let treatments = [];
  export let config;

  let newTreatment;
  let newTreatmentSelect;

  $: remaining = treatments
    .filter((t) => !config.treatments.some((tt) => deepEqual(tt, t)))
    .sort((t, tt) => (t.name.toUpperCase() > tt.name.toUpperCase() ? 1 : -1));

  $: {
    if (newTreatment) {
      config.treatments.push(newTreatment);
      config = config;
      newTreatment = null;
      if (
        treatments.length === config.treatments.length &&
        newTreatmentSelect
      ) {
        newTreatmentSelect.blur();
      }
    }
  }

  function remove(conf) {
    return function () {
      config.treatments = config.treatments.filter((t) => t !== conf);
      // config = config;
    };
  }
</script>

<LabelBox label="Treatments">
  {#each config.treatments as conf}
    <div class="line">
      <div title={formatFactorsToString(conf.factors, "\n")}>
        <Select
          bind:selected={conf}
          options={[conf]
            .concat(remaining)
            .map((t) => ({ label: t.name, value: t }))}
        />
      </div>
      <div class="flex items-center">
        <button type="button" on:click={remove(conf)} class="w-6 h-6">
          <Trash />
        </button>
      </div>
    </div>
  {/each}
  <div
    class="max-w-xs {config.treatments.length > 0
      ? 'pt-4'
      : ''} {remaining.length === 0 ? 'opacity-50' : ''}"
  >
    <Select
      disabled={remaining.length === 0}
      placeholder={remaining.length > 0
        ? "Add Treatment"
        : "No treatments left"}
      bind:selected={newTreatment}
      testId="treatmentSelect"
      options={remaining.map((t) => ({ label: t.name, value: t }))}
      bind:el={newTreatmentSelect}
    />
  </div>
</LabelBox>

<LabelBox label="Game Count">
  <div class="w-32">
    <Input
      id="count"
      type="number"
      suffix={config.count === 1 ? "game" : "games"}
      right
      placeholder="0"
      testId="gameCountInput"
      bind:value={config.count}
    />
  </div>
</LabelBox>

<style>
  .line {
    @apply mb-3 grid gap-3 items-center;
    grid-template-columns: 1fr 64px;
  }
</style>
