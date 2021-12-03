<script context="module">
  const title = "New Batch";
  const desc = `
    Create a new Batch with Simple, Complete or Custom assignment methods.
  `;
  const descMore = `
- **Simple** creates a fixed number of Games with random Treatments.  
- **Complete** allows defining how many Games of each Treatment to run.  
- **Custom** allows Custom assignment by passing an optional JSON configuration.  
  With Custom, you are responsible for creating Games in your Callbacks.  
  `;
  const treatmentSVGPath =
    "M160 168v-48c0-13.3-10.7-24-24-24H96V8c0-4.4-3.6-8-8-8H72c-4.4 0-8 3.6-8 8v88H24c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h40v312c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8V192h40c13.3 0 24-10.7 24-24zm-32-8H32v-32h96v32zm152 160h-40V8c0-4.4-3.6-8-8-8h-16c-4.4 0-8 3.6-8 8v312h-40c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h40v88c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8v-88h40c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zm-8 64h-96v-32h96v32zm152-224h-40V8c0-4.4-3.6-8-8-8h-16c-4.4 0-8 3.6-8 8v152h-40c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h40v248c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8V256h40c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zm-8 64h-96v-32h96v32z";
</script>

<script>
  import { push } from "svelte-spa-router";
  import { currentAdmin } from "../../utils/auth";
  import { validateBatchConfig } from "../../utils/batches";
  import Alert from "../common/Alert.svelte";
  import ButtonGroup from "../common/ButtonGroup.svelte";
  import EmptyState from "../common/EmptyState.svelte";
  import LabelBox from "../common/LabelBox.svelte";
  import SlideOver from "../overlays/SlideOver.svelte";
  import CompleteAssignment from "./CompleteAssignment.svelte";
  import CustomAssignment from "./CustomAssignment.svelte";
  import SimpleAssignment from "./SimpleAssignment.svelte";

  export let newBatch = false;

  let assignmentMethod = "complete";

  export let treatments = [];
  let complete = { kind: "complete", config: { treatments: [] } };
  let simple = { kind: "simple", config: { treatments: [], count: 1 } };
  let custom = { kind: "custom", config: {} };

  let error = null;
  $: {
    // Reset error if any edits are made
    if (simple || complete || custom) {
      error = null;
    }
  }

  function handleSubmit() {
    let config;
    switch (assignmentMethod) {
      case "simple":
        config = simple;
        break;
      case "complete":
        config = complete;
        break;
      case "custom":
        config = custom;
        break;
      default:
        throw new Error("unknown assgnement method");
    }

    console.info("submitting", JSON.stringify(config));

    error = null;
    try {
      validateBatchConfig(config);
      $currentAdmin.createBatch({ config });
      newBatch = false;
    } catch (err) {
      error = err.toString();
    }
  }

  $: assigmentMethodOptions = [
    {
      label: "Complete",
      onClick: () => (assignmentMethod = "complete"),
      selected: assignmentMethod === "complete",
    },
    {
      label: "Simple",
      onClick: () => (assignmentMethod = "simple"),
      selected: assignmentMethod === "simple",
    },
    {
      label: "Custom",
      onClick: () => (assignmentMethod = "custom"),
      selected: assignmentMethod === "custom",
    },
  ];

  const actions = [
    {
      onClick: () => (newBatch = false),
      label: "Cancel",
    },
    {
      label: "Create",
      primary: true,
      submit: true,
    },
  ];
</script>

<SlideOver
  {title}
  {desc}
  {descMore}
  {actions}
  bind:open={newBatch}
  on:submit={handleSubmit}
>
  <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
    <LabelBox label="Assignment Method">
      <ButtonGroup options={assigmentMethodOptions} />
    </LabelBox>

    {#if assignmentMethod === "custom"}
      <CustomAssignment bind:config={custom.config} />
    {:else if !treatments || treatments.length === 0}
      <div class="sm:col-span-4">
        <EmptyState
          svgPath={treatmentSVGPath}
          svgWidth={448}
          on:click={() => push("/treatments")}
        >
          Create a Treatment
        </EmptyState>
      </div>
    {:else if assignmentMethod === "complete"}
      <CompleteAssignment
        {treatments}
        bind:config={complete.config.treatments}
      />
    {:else if assignmentMethod === "simple"}
      <SimpleAssignment {treatments} bind:config={simple.config} />
    {:else}
      Error, unknown method!
    {/if}
  </div>

  {#if error}
    <div class="mt-4">
      <Alert>{error}</Alert>
    </div>
  {/if}
</SlideOver>