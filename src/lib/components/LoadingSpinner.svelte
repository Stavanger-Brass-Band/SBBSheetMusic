<script lang="ts">
  import { Spinner } from "$lib/components/ui";

  // Section/page loading indicator. Built on the bespoke ui/Spinner so the app
  // has a single spinner implementation.
  let { label = "", inline = false }: { label?: string; inline?: boolean } =
    $props();
</script>

<div class="loader" class:inline>
  {#if inline}
    <Spinner size={24} />
  {:else}
    <Spinner {label} />
  {/if}
</div>

<style>
  .loader {
    display: flex;
    justify-content: center;
    padding: 64px 0;
  }
  .loader.inline {
    padding: 24px 0;
  }
</style>
