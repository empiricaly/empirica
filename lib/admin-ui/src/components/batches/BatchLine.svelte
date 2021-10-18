<script>
  import { cubicInOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import { clickOutside } from "../../utils/clickoutside";

  let open = false;

  function clickOutsideHandler() {
    open = false;
  }
</script>

<tr>
  <td class="px-6 py-3 text-sm font-medium text-gray-900">
    <div class="flex items-center space-x-3 lg:pl-2">
      <span
        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
      >
        Running
      </span>
    </div>
  </td>
  <td
    class="hidden md:table-cell px-6 py-3 whitespace-nowrap text-sm text-gray-500"
  >
    March 17, 2020
  </td>
  <td
    class="hidden md:table-cell px-6 py-3 whitespace-nowrap text-sm text-gray-500"
  >
    March 17, 2020
  </td>
  <td
    class="hidden  max-w-0 w-full whitespace-nowrap md:table-cell px-6 py-3 text-sm text-gray-500"
  >
    March 17, 2020
  </td>
  <td
    class="hidden  max-w-0 w-full whitespace-nowrap md:table-cell px-6 py-3 text-sm text-gray-500 text-center"
  >
    10
  </td>
  <td class="pr-6">
    <div class="relative flex justify-end items-center">
      <button
        type="button"
        class="w-8 h-8 bg-white inline-flex items-center justify-center text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
        id="project-options-menu-0-button"
        aria-expanded="false"
        aria-haspopup="true"
        on:click={() => (open = !open)}
      >
        <span class="sr-only">Open actions</span>
        <!-- Heroicon name: solid/dots-vertical -->
        <svg
          class="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
          />
        </svg>
      </button>

      {#if open}
        <div
          transition:fly={{
            duration: 100,
            x: 0,
            y: 20,
            opacity: 0,
            easing: cubicInOut,
          }}
          class="mx-3 origin-top-right absolute right-7 top-0 w-48 mt-1 rounded-md shadow-lg z-10 bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="project-options-menu-0-button"
          tabindex="-1"
          use:clickOutside={clickOutsideHandler}
        >
          <div class="py-1" role="none">
            <!-- Active: "bg-gray-100 text-gray-900", Not Active: "text-gray-700" -->
            <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-0"
            >
              <!-- Heroicon name: solid/pencil-alt -->
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"
                />
                <path
                  fill-rule="evenodd"
                  d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                  clip-rule="evenodd"
                />
              </svg>
              Edit
            </button>
            <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-1"
            >
              <!-- Heroicon name: solid/duplicate -->
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"
                />
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
              </svg>
              Duplicate
            </button>
            <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-2"
            >
              <!-- Heroicon name: solid/user-add -->
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"
                />
              </svg>
              Share
            </button>
          </div>
          <div class="py-1" role="none">
            <button
              type="button"
              class="text-gray-700 group flex items-center px-4 py-2 text-sm"
              role="menuitem"
              tabindex="-1"
              id="project-options-menu-0-item-3"
            >
              <!-- Heroicon name: solid/trash -->
              <svg
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      {/if}
    </div>
  </td>
</tr>
