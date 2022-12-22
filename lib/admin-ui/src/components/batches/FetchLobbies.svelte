<script>
  import { getLobbies } from "../../utils/lobbies.js";
  import Alert from "../common/Alert.svelte";
  import Loading from "../common/Loading.svelte";
</script>

{#await getLobbies()}
  <Loading />
{:then conf}
  <slot lobbies={conf.lobbies} />
{:catch error}
  <Alert title="Load error">
    Failed to fetch
    <code class="bg-red-100 px-1 py-1 rounded">.empirica/lobbies.yaml</code>.
    Make sure the server is started then reload. ({error.toString()})
  </Alert>
{/await}
