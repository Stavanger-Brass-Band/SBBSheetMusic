<script module lang="ts">
  /**
   * How long a "Lagret" confirmation stays up before the indicator goes quiet
   * again. Lives with the indicator so every auto-saving control flashes for the
   * same beat.
   */
  export const SAVED_VISIBLE_MS = 2000;
</script>

<script lang="ts">
  import { Check } from "@lucide/svelte";
  import Spinner from "./Spinner.svelte";
  import type { SaveState } from "$lib/types";

  /**
   * Progress for anything that saves on its own, without a Lagre button — a
   * field that autosaves, a toggle that writes immediately. Renders nothing when
   * idle, so it takes no room until there is something to report.
   */
  let { state }: { state: SaveState } = $props();
</script>

{#if state === "saving"}
  <span class="save saving"><Spinner size={12} inline /> Lagrer…</span>
{:else if state === "saved"}
  <span class="save saved"><Check size={13} /> Lagret</span>
{/if}

<style>
  .save {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    white-space: nowrap;
  }
  .saving {
    color: var(--text-muted);
  }
  .saved {
    color: var(--success);
  }
</style>
