<script>
  import { TajribaConnection } from "@empirica/core/user";
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import Loading from "./components/common/Loading.svelte";
  import Layout from "./components/layout/Layout.svelte";
  import SignIn from "./components/SignIn.svelte";
  import { DEFAULT_TOKEN_KEY, URL } from "./constants";
  import { routes } from "./routes";
  import { setCurrentAdmin } from "./utils/auth";

  const queryURL = `${URL}/query`;

  let loggedIn = false;
  let loaded = false;

  const token = window.localStorage.getItem(DEFAULT_TOKEN_KEY);

  async function initLogin() {
    await sessionLogin();
    loaded = true;
  }
  onMount(initLogin);

  async function sessionAdmin(t) {
    const tajriba = new TajribaConnection(queryURL);

    let resolve;
    const prom = new Promise((r) => (resolve = r));
    const sub = tajriba.connected.subscribe({
      next: (connected) => {
        if (connected) {
          resolve();
        }
      },
    });
    await prom;
    sub.unsubscribe();

    let sub2;
    sub2 = tajriba.connected.subscribe({
      next: (connected) => {
        if (!connected) {
          console.info("Disconnected");
          setCurrentAdmin(null);
          sub2.unsubscribe();
          loggedIn = false;
          loaded = false;
          initLogin();
        }
      },
    });

    const admin = await tajriba.sessionAdmin(t);
    setCurrentAdmin(admin);
    loggedIn = true;
    console.info("Connected");
  }

  async function sessionLogin() {
    if (token) {
      try {
        await sessionAdmin(token);
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

    while (true) {
      try {
        const res = await fetch(`${URL}/dev`, { cache: "reload" });
        await setDevToken(res.status === 200);
      } catch (err) {
        if (err instanceof TypeError && err.message === "Load failed") {
          await new Promise((r) => setTimeout(r, 1000));
          if (loaded) {
            return;
          }
          console.log("Tajriba down. Retrying in 1s...");
          continue;
        }
        await setDevToken(false);
        console.error("fetch dev status", err);
      }

      break;
    }
  }

  async function setDevToken(isDev) {
    dev = isDev;

    if (isDev) {
      await sessionAdmin("123456789");
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
