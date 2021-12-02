<script>
  import { Empirica } from "@empirica/admin";
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import Loading from "./components/common/Loading.svelte";
  import Layout from "./components/layout/Layout.svelte";
  import SignIn from "./components/SignIn.svelte";
  import { DEFAULT_TOKEN_KEY, URL } from "./constants";
  import { routes } from "./routes";
  import { setCurrentAdmin } from "./utils/auth";

  let loggedIn = false;
  let loaded = false;

  const token = window.localStorage.getItem(DEFAULT_TOKEN_KEY);

  onMount(async function () {
    await sessionLogin();
    loaded = true;
  });

  async function sessionLogin() {
    if (token) {
      try {
        const admin = await Empirica.sessionLogin(`${URL}/query`, token);
        setCurrentAdmin(admin);
        loggedIn = true;
      } catch (e) {
        console.info("Failed to reconnect", e);
        await checkDev();
      }
    } else {
      await checkDev();
    }
  }

  let dev = false;
  async function checkDev() {
    if (loaded) {
      return;
    }

    try {
      const res = await fetch(`${URL}/dev`);
      await setDevToken(res.status === 200);
    } catch (err) {
      await setDevToken(false);
      console.error("fetch dev status", err);
    }
  }

  async function setDevToken(isDev) {
    dev = isDev;

    if (isDev) {
      const admin = await Empirica.devLogin(`${URL}/query`);
      setCurrentAdmin(admin);
      loggedIn = true;
    }
  }
</script>

<main class="flex flex-col apply min-h-screen text-gray-600">
  {#if !loaded}
    <Loading />
  {:else if !loggedIn}
    <SignIn bind:loggedIn />
  {:else}
    <Layout>
      <Router {routes} />
    </Layout>
  {/if}
</main>
