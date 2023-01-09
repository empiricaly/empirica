<script>
  import { quintInOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import { md } from "../../utils/md.js";
  import Button from "../common/Button.svelte";

  export let title = null;
  export let desc = null;
  export let descMore = null;
  export let open = false;
  export let custom = false;
  export let disableBgCloseClick = false;
  export let disableCloseButton = false;
  export let actions = null;

  let showMore = false;

  function backgroundClose() {
    if (!disableBgCloseClick) {
      open = false;
    }
  }

  function backgroundCloseKeypress(evt) {
    if (evt.target !== evt.currentTarget) {
      return;
    }

    backgroundClose();
  }

  function buttonClose() {
    if (!disableCloseButton) {
      open = false;
    }
  }

  let showBg = false;
  let showBgT = null;

  $: {
    clearTimeout(showBgT);
    showBgT = setTimeout(function () {
      showBg = open;
    }, 10);
  }
</script>

{#if open}
  <div
    class="fixed inset-0 overflow-hidden transition duration-300 bg-gray-900 {showBg
      ? 'bg-opacity-20'
      : 'bg-opacity-0'}"
    on:click={backgroundClose}
    on:keypress={backgroundCloseKeypress}
  >
    <div class="absolute inset-0 overflow-hidden">
      <section class="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <form
          action=""
          class="w-screen max-w-2xl"
          on:submit|preventDefault
          on:click|stopPropagation
          on:keypress|stopPropagation
          transition:fly={{
            duration: 300,
            x: 672,
            y: 0,
            opacity: 1,
            easing: quintInOut,
          }}
        >
          {#if custom}
            <slot />
          {:else}
            <div
              class="h-full flex flex-col space-y-6 bg-white shadow-xl
             overflow-y-scroll"
            >
              <div class="px-4 py-6 bg-gray-50 sm:px-6">
                <div class="flex items-start justify-between space-x-3">
                  <div class="space-y-1">
                    <h2
                      class="text-lg font-medium text-gray-900"
                      id="slide-over-title"
                    >
                      {title}
                    </h2>
                    {#if desc}
                      <p class="text-sm text-gray-500">
                        {desc}
                        {#if descMore}
                          <button
                            type="button"
                            class="text-empirica-400"
                            on:click={() => (showMore = !showMore)}
                          >
                            {#if showMore}
                              Hide
                            {:else}
                              More
                            {/if}
                          </button>
                        {/if}
                      </p>
                      {#if descMore && showMore}
                        <p class="mt-2 text-sm text-gray-500">
                          {@html md.render(descMore)}
                        </p>
                      {/if}
                    {/if}
                  </div>
                  {#if !disableCloseButton}
                    <div class="h-7 flex items-center">
                      <button
                        type="button"
                        class="text-gray-400 hover:text-gray-500"
                        on:click={() => (open = false)}
                      >
                        <span class="sr-only">Close panel</span>
                        <!-- Heroicon name: outline/x -->
                        <svg
                          class="h-6 w-6"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="relative flex-1 px-4 sm:px-6">
                <slot />
              </div>

              {#if actions}
                <div
                  class="flex-shrink-0 px-4 border-t border-gray-200 py-5 sm:px-6"
                >
                  <div class="space-x-3 flex justify-end">
                    {#each actions as action}
                      <Button
                        primary={action.primary}
                        on:click={action.onClick ? action.onClick : () => {}}
                        kind={action.submit ? "submit" : "button"}
                        testId={action.testId}
                      >
                        {action.label}
                      </Button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </form>
      </section>
    </div>
  </div>
{/if}
