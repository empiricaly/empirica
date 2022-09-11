<script>
  import Page from "../common/Page.svelte";
  import Factors from "./Factors.svelte";
</script>

<Page title="Factors">
  <span slot="labels">
    You can edit Factors here or in the <code>.empirica/treatments.yaml</code> file.
    Updates are automatically saved on this page. If you make changes to the yaml
    file, make sure to reload this page.
  </span>

  <div class="max-w-7xl">
    <Factors />
  </div>
</Page>
