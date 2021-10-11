<script>
  import { cubicInOut } from "svelte/easing";
  import { fade } from "svelte/transition";
</script>

<main class="flex-1 relative z-0 overflow-y-auto focus:outline-none">
  <!-- Page title & actions -->
  <div
    class="border-b border-gray-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8"
  >
    <div class="flex-1 min-w-0">
      <h1 class="text-lg font-medium leading-6 text-gray-900 sm:truncate">
        Homee
      </h1>
    </div>
    <div class="mt-4 flex sm:mt-0 sm:ml-4">
      <button
        type="button"
        class="order-1 ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 sm:order-0 sm:ml-0"
      >
        Share
      </button>
      <button
        type="button"
        class="order-0 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500 sm:order-1 sm:ml-3"
      >
        Create
      </button>
    </div>
  </div>

  <!-- Projects list (only on smallest breakpoint) -->
  <div class="sm:hidden">
    <div class="px-4 sm:px-6">
      <h2 class="text-gray-500 text-xs font-medium uppercase tracking-wide">
        Projects
      </h2>
    </div>
    <ul
      role="list"
      class="mt-3 border-t border-gray-200 divide-y divide-gray-100"
    >
      <li>
        <a
          href="#"
          class="group flex items-center justify-between px-4 py-4 hover:bg-gray-50 sm:px-6"
        >
          <span class="flex items-center truncate space-x-3">
            <span
              class="w-2.5 h-2.5 flex-shrink-0 rounded-full bg-pink-600"
              aria-hidden="true"
            />
            <span class="font-medium truncate text-sm leading-6">
              GraphQL API
              <span class="truncate font-normal text-gray-500"
                >in Engineering</span
              >
            </span>
          </span>
          <!-- Heroicon name: solid/chevron-right -->
          <svg
            class="ml-4 h-5 w-5 text-gray-400 group-hover:text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </a>
      </li>

      <!-- More projects... -->
    </ul>
  </div>

  <!-- Projects table (small breakpoint and up) -->
  <div class="hidden sm:block">
    <div class="align-middle inline-block min-w-full border-b border-gray-200">
      <table class="min-w-full">
        <thead>
          <!-- <tr class="border-t border-gray-200"> -->
          <tr class="">
            <th
              class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <span class="lg:pl-2">Project</span>
            </th>
            <th
              class="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Members
            </th>
            <th
              class="hidden md:table-cell px-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Last updated
            </th>
            <th
              class="pr-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            />
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          <tr>
            <td
              class="px-6 py-3 max-w-0 w-full whitespace-nowrap text-sm font-medium text-gray-900"
            >
              <div class="flex items-center space-x-3 lg:pl-2">
                <div
                  class="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-pink-600"
                  aria-hidden="true"
                />
                <a href="#" class="truncate hover:text-gray-600">
                  <span>
                    GraphQL API
                    <span class="text-gray-500 font-normal">in Engineering</span
                    >
                  </span>
                </a>
              </div>
            </td>
            <td class="px-6 py-3 text-sm text-gray-500 font-medium">
              <div class="flex items-center space-x-2">
                <div class="flex flex-shrink-0 -space-x-1">
                  <img
                    class="max-w-none h-6 w-6 rounded-full ring-2 ring-white"
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="Dries Vincent"
                  />

                  <img
                    class="max-w-none h-6 w-6 rounded-full ring-2 ring-white"
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="Lindsay Walton"
                  />

                  <img
                    class="max-w-none h-6 w-6 rounded-full ring-2 ring-white"
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="Courtney Henry"
                  />

                  <img
                    class="max-w-none h-6 w-6 rounded-full ring-2 ring-white"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="Tom Cook"
                  />
                </div>

                <span class="flex-shrink-0 text-xs leading-5 font-medium"
                  >+8</span
                >
              </div>
            </td>
            <td
              class="hidden md:table-cell px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right"
            >
              March 17, 2020
            </td>
            <td class="pr-6">
              <div class="relative flex justify-end items-center">
                <button
                  type="button"
                  class="w-8 h-8 bg-white inline-flex items-center justify-center text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
                  id="project-options-menu-0-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <span class="sr-only">Open options</span>
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

                <!--
                  Dropdown menu, show/hide based on menu state.

                  Entering: "transition ease-out duration-100"
                    From: "transform opacity-0 scale-95"
                    To: "transform opacity-100 scale-100"
                  Leaving: "transition ease-in duration-75"
                    From: "transform opacity-100 scale-100"
                    To: "transform opacity-0 scale-95"
                -->
                <div
                  transition:fade={{ duration: 300, easing: cubicInOut }}
                  class="mx-3 origin-top-right absolute right-7 top-0 w-48 mt-1 rounded-md shadow-lg z-10 bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-200 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="project-options-menu-0-button"
                  tabindex="-1"
                >
                  <div class="py-1" role="none">
                    <!-- Active: "bg-gray-100 text-gray-900", Not Active: "text-gray-700" -->
                    <a
                      href="#"
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
                    </a>
                    <a
                      href="#"
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
                        <path
                          d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"
                        />
                      </svg>
                      Duplicate
                    </a>
                    <a
                      href="#"
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
                    </a>
                  </div>
                  <div class="py-1" role="none">
                    <a
                      href="#"
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
                    </a>
                  </div>
                </div>
              </div>
            </td>
          </tr>

          <!-- More projects... -->
        </tbody>
      </table>
    </div>
  </div>
</main>
