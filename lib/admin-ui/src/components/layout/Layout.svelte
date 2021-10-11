<script>
  import Sidebar from "./Sidebar.svelte";

  let showMenu = false;
  let showProfileMenu = false;
</script>

<div class="relative h-screen flex overflow-hidden bg-white">
  <!-- Static sidebar for desktop -->
  <div class="hidden lg:flex lg:flex-shrink-0">
    <div class="w-64 bg-gray-800">
      <Sidebar />
    </div>
  </div>
  <!-- Main column -->
  <div class="flex flex-col w-0 flex-1 overflow-hidden">
    <!-- Search header -->
    <slot>Not found</slot>
  </div>
</div>
