<script>
  import Page from "../common/Page.svelte";
  import Factors from "./Factors.svelte";
  import Treatments from "./Treatments.svelte";
</script>

<Page title="Treatments and Factors">
  <span slot="labels">
    Edit your <code>.empirica/treatments.yaml</code> file. Updates are automatically
    saved.
  </span>

  <div class="max-w-7xl">
    <Treatments />
    <div class="mt-10"><Factors /></div>
  </div>
</Page>
