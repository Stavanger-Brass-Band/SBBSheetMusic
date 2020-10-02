<script>
  import Spinner from "../../public/img/ripple.svg";

  export let inline = false;
</script>

<style>
  .loader-container {
    text-align: center;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .loader-container-inline {
    text-align: center;
  }
</style>

{#if inline}
  <div class="loader-container-inline">
    {@html Spinner}
  </div>
{:else}
  <div class="loader-container">
    {@html Spinner}
  </div>
{/if}
