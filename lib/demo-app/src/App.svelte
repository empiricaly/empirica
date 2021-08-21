<script>
  import Footer from "$components/Footer.svelte";
  import Game from "$components/Game.svelte";
</script>

<main>
  <section class="flex flex-grow">
    <Game key="a" />
    <Game key="b" />
  </section>
  <Footer>Empirica v2 Demo</Footer>
</main>

<style global lang="postcss">
  main {
    @apply flex flex-col min-h-screen text-gray-600 h-full;
  }
</style>
