<script>
  import Button from "./common/Button.svelte";
  import ButtonGroup from "./common/ButtonGroup.svelte";
  import LabelBox from "./common/LabelBox.svelte";
  import Page from "./common/Page.svelte";

  let exportMethod = "CSV";

  $: exportMethodOptions = [
    {
      label: "CSV",
      onClick: () => (exportMethod = "CSV"),
      selected: exportMethod === "CSV",
      testId: "csvButton",
    },
    {
      label: "JSON",
      onClick: () => (exportMethod = "JSON"),
      selected: exportMethod === "JSON",
      testId: "jsonButton",
    },
  ];
</script>

<Page title="Export">
  <span slot="labels"> Export all the data from the database. </span>

  <div class="max-w-7xl">
    <LabelBox label="Export Format">
      <ButtonGroup options={exportMethodOptions} />
    </LabelBox>

    <div class="mt-4">
      <Button testId="exportButton">Export</Button>
    </div>
  </div>
</Page>
