<script>
  import { stageTimer } from "@empirica/player";
</script>

<div class="mt-8 flex flex-col items-center">
  <h1 class="font-monotext-lg font-bold">
    {$stageTimer === null ? "-" : $stageTimer}
  </h1>
  seconds
</div>
