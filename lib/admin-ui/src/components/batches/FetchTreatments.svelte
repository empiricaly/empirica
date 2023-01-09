<script>
  import { getTreatments } from "../../utils/treatments.js";
  import Alert from "../common/Alert.svelte";
  import Loading from "../common/Loading.svelte";
</script>

{#await getTreatments()}
  <Loading />
{:then conf}
  <slot treatments={conf.treatments} factors={conf.factors} />
{:catch error}
  <Alert title="Load error">
    Failed to fetch
    <code class="bg-red-100 px-1 py-1 rounded">.empirica/treatments.yaml</code>.
    Make sure the server is started then reload. ({error.toString()})
  </Alert>
{/await}
