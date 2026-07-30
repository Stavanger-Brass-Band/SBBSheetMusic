<script lang="ts">
  import { ArrowDown, ArrowUp, ChevronsUpDown } from "@lucide/svelte";
  import type { SortState } from "$lib/utils/listQuery";

  // A `.sbb-table` header cell that sorts its own column. Only the active
  // column keeps its direction arrow on screen — the rest reveal a neutral
  // hint on hover, so the header row stays quiet until you reach for it.
  // Column widths belong on the matching `td` rule: scoped styles from the
  // page don't reach the `th` this component renders.
  let {
    field,
    label,
    sort,
    onsort,
  }: {
    field: string;
    label: string;
    sort: SortState;
    onsort: (field: string) => void;
  } = $props();

  let isActive = $derived(sort.field === field);
  let ariaSort = $derived<"none" | "ascending" | "descending">(
    !isActive ? "none" : sort.direction === "asc" ? "ascending" : "descending",
  );
</script>

<th aria-sort={ariaSort}>
  <button
    type="button"
    class="sort-header"
    class:active={isActive}
    onclick={() => onsort(field)}
  >
    {label}
    <span class="arrow">
      {#if !isActive}
        <ChevronsUpDown size={13} />
      {:else if sort.direction === "asc"}
        <ArrowUp size={13} />
      {:else}
        <ArrowDown size={13} />
      {/if}
    </span>
  </button>
</th>

<style>
  /* Inherit the header type from `.sbb-table thead th` — `font` alone leaves
     the tracking and casing behind. */
  .sort-header {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    color: inherit;
    background: none;
    border: 0;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color var(--dur-fast);
  }
  .sort-header:hover,
  .sort-header.active {
    color: var(--text-primary);
  }
  .sort-header:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .arrow {
    display: inline-flex;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity var(--dur-fast);
  }
  .sort-header:hover .arrow,
  .sort-header:focus-visible .arrow {
    opacity: 1;
  }
  .sort-header.active .arrow {
    color: var(--accent);
    opacity: 1;
  }
</style>
