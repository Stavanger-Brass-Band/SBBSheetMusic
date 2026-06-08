<script lang="ts">
  import { Spinner } from "flowbite-svelte";

  let { inline = false }: { inline?: boolean } = $props();
</script>

{#if inline}
  <div class="loader-container-inline"><Spinner size="8" /></div>
{:else}
  <div class="loader-container"><Spinner size="10" /></div>
{/if}

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
