<script>
  import { Empirica } from "@empirica/admin";
  import { DEFAULT_TOKEN_KEY, URL } from "../constants";
  import { setCurrentAdmin } from "../utils/auth";
  import { focus } from "../utils/use";
  import Logo from "./layout/Logo.svelte";

  export let loggedIn = false;

  let username = "";
  let password = "";

  let signingIn = false;
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      signingIn = true;
      const [admin, token] = await Empirica.loginAdmin(
        `${URL}/query`,
        username,
        password
      );
      window.localStorage.setItem(DEFAULT_TOKEN_KEY, token.toString());
      loggedIn = true;
      setCurrentAdmin(admin);
    } catch (error) {
      console.error("admin sign in", error);
      alert("Failed to signin");
    } finally {
      signingIn = false;
    }
  }
</script>

<div
  class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
>
  <div class="max-w-md w-full space-y-8">
    <div>
      <Logo classString="h-14 w-full fill-current" />
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to Empirica Admin
      </h2>
    </div>

    <form
      class="mt-8 space-y-6"
      action="#"
      method="POST"
      on:submit={handleSubmit}
    >
      <input type="hidden" name="remember" value="true" />
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="username" class="sr-only">Username</label>
          <input
            use:focus
            id="username"
            name="username"
            type="username"
            data-test="usernameInput"
            bind:value={username}
            required
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 focus:z-10 sm:text-sm"
            placeholder="username"
          />
        </div>
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            data-test="passwordInput"
            bind:value={password}
            autocomplete="current-password"
            required
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-empirica-500 focus:border-empirica-500 focus:z-10 sm:text-sm"
            placeholder="Password"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          data-test="signInButton"
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-empirica-600 hover:bg-empirica-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-empirica-500"
          disabled={signingIn}
        >
          <span class="absolute left-0 inset-y-0 flex items-center pl-3">
            <!-- Heroicon name: solid/lock-closed -->
            <svg
              class="h-5 w-5 text-empirica-500 group-hover:text-empirica-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
          Sign in
        </button>
      </div>
    </form>
  </div>
</div>
