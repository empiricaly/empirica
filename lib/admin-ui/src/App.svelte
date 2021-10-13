<script>
  import Router from "svelte-spa-router";
  import Layout from "./components/layout/Layout.svelte";
  import SignIn from "./components/SignIn.svelte";
  import { routes } from "./routes";
  import { afterUpdate } from "svelte";
  import { Empirica } from "@empirica/admin";
  import { DEFAULT_TOKEN_KEY, URL } from "./constants";

  let loggedIn = false;
  let loaded = false;

  let tokenKey = DEFAULT_TOKEN_KEY;

  afterUpdate(() => {
    const token = window.localStorage.getItem(tokenKey) || undefined;
    if (token) {
      (async () => {
        try {
          let adminSessionLoggedIn = await Empirica.sessionLogin(
            `${URL}/query`,
            token
          );
          loggedIn =
            adminSessionLoggedIn !== undefined || adminSessionLoggedIn !== null;
        } catch (e) {
          console.warn("Failed to reconnect", e);
        } finally {
          loaded = true;
        }
      })();
    } else {
      loaded = true;
    }
  });
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
