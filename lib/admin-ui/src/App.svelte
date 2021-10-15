<script>
  import { Empirica } from "@empirica/admin";
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import Layout from "./components/layout/Layout.svelte";
  import SignIn from "./components/SignIn.svelte";
  import { DEFAULT_TOKEN_KEY, URL } from "./constants";
  import { routes } from "./routes";
  import { setCurrentAdmin } from "./utils/auth";

  let loggedIn = false;
  let loaded = false;

  const token = window.localStorage.getItem(DEFAULT_TOKEN_KEY);

  onMount(function () {
    if (token) {
      sessionLogin();
    } else {
      loaded = true;
    }
  });

  async function sessionLogin() {
    try {
      const admin = await Empirica.sessionLogin(`${URL}/query`, token);
      setCurrentAdmin(admin);
      loggedIn = true;
    } catch (e) {
      console.info("Failed to reconnect", e);
    } finally {
      loaded = true;
    }
  }
</script>

<main class="flex flex-col apply min-h-screen text-gray-600">
  {#if !loaded}
    Loading
  {:else if !loggedIn}
    <SignIn bind:loggedIn />
  {:else}
    <Layout>
      <Router {routes} />
    </Layout>
  {/if}
</main>

<style global lang="postcss">
  :global(footer) {
    @apply bg-teal-500;
  }
</style>
