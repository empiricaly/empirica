<script>
  import Router from "svelte-spa-router";
  import Layout from "./components/layout/Layout.svelte";
  import { routes } from "./routes";
</script>

<main class="flex flex-col apply min-h-screen text-gray-600">
  <Layout>
    <Router {routes} />
  </Layout>
</main>

<style global lang="postcss">
  :global(footer) {
    @apply bg-teal-500;
  }

  h5 {
    @apply text-center text-4xl;
  }

  img {
    @apply h-24;
  }
</style>
