<script>
  import Page from "../common/Page.svelte";
  import Factors from "./Factors.svelte";
  import Treatments from "./Treatments.svelte";
</script>

<Page title="Treatments">
  <span slot="labels">
    You can edit Treatments here or in the
    <code>.empirica/treatments.yaml</code> file. Updates are automatically saved
    on this page. If you make changes to the yaml file, make sure to reload this
    page.
  </span>

  <div class="max-w-7xl">
    <Treatments />
  </div>
</Page>
