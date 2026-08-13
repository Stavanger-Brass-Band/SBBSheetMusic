<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * A pill that narrows a list to one value, with the selected one filled in
   * brass. Sits in a `.sbb-filter-row` (see `app.css`) alongside the others,
   * including the "Alle" pill that clears the filter — that one is a chip like
   * any other, since "no filter" is one of the choices rather than a reset.
   */
  let {
    active = false,
    onclick,
    children,
  }: {
    active?: boolean;
    onclick?: () => void;
    children: Snippet;
  } = $props();
</script>

<button type="button" class="chip" class:active {onclick}>
  {@render children()}
</button>

<style>
  .chip {
    height: 32px;
    padding: 0 14px;
    font-family: var(--font-text);
    font-weight: 500;
    font-size: 13px;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-full);
    cursor: pointer;
    white-space: nowrap;
    transition:
      color var(--dur-fast),
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .chip:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }
  .chip.active {
    color: var(--accent-on);
    background: var(--accent);
    border-color: var(--accent);
  }
</style>
