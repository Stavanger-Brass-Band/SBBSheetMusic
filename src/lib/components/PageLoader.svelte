<script lang="ts">
  import { Loader } from "$lib/components/ui";

  // Page and section loading indicator, and the one place that decides which
  // brass mark a wait gets: the valve cluster for a whole page, being the most
  // iconic mark a brass band has, and the trombone slide for a section, where
  // the wide horizontal shape suits the block it stands in for. Both carry the
  // caller's label — say what is being fetched, not that something is.
  let { label = "", inline = false }: { label?: string; inline?: boolean } =
    $props();
</script>

<div class="loader" class:inline>
  <Loader variant={inline ? "slide" : "valves"} size="lg" {label} />
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
