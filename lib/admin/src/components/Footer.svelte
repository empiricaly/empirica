<footer class="w-screen flex justify-center py-4">
  <slot />
</footer>

<style lang="postcss">
  footer {
    @apply bg-vite-300;
  }

  @screen md {
    footer {
      @apply bg-windi-500;
    }
  }
</style>
