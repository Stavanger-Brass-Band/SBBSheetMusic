<script lang="ts">
  import { Check } from "@lucide/svelte";
  import { byCatalogOrder } from "$lib/utils/partOrder";
  import { INSTRUMENT_GROUPS, type Part } from "$lib/types";
  import { SearchInput } from "$lib/components/ui";

  /**
   * Multi-select over a list of parts, grouped by instrument group and searchable
   * by name or alias. The catalogue runs to a few dozen parts — too many to scan
   * in a plain select — so search is what makes it usable and the groups are what
   * keep the unsearched list navigable.
   *
   * `selectedIds` is bindable and holds only ids: the dialog around this owns what
   * to do with a selection, and ids are what the assign endpoint takes.
   */
  let {
    parts,
    selectedIds = $bindable(),
  }: { parts: Part[]; selectedIds: string[] } = $props();

  let searchTerm = $state("");

  /**
   * The parts to show, bucketed by instrument group in band order. Aliases count
   * as matches too — they exist precisely because the same part goes by several
   * names ("Cornet 1", "1st Cornet", "Kornett I"), so someone searching the name
   * they know should still find it.
   */
  let groups = $derived.by(() => {
    const query = searchTerm.trim().toLowerCase();
    const visible = parts.filter(
      (part) =>
        !query ||
        (part.name ?? "").toLowerCase().includes(query) ||
        (part.aliases ?? []).some((alias) =>
          alias.toLowerCase().includes(query),
        ),
    );
    return [...INSTRUMENT_GROUPS, null]
      .map((group) => ({
        label: group ?? "Uten gruppe",
        parts: visible
          .filter((part) => (part.instrumentGroup ?? null) === group)
          .sort(byCatalogOrder),
      }))
      .filter((group) => group.parts.length > 0);
  });

  function isSelected(partId: string): boolean {
    return selectedIds.includes(partId);
  }

  function toggle(partId: string): void {
    selectedIds = isSelected(partId)
      ? selectedIds.filter((id) => id !== partId)
      : [...selectedIds, partId];
  }
</script>

<SearchInput placeholder="Søk på stemmenavn…" bind:value={searchTerm} />

{#if groups.length === 0}
  <p class="empty">
    {parts.length === 0
      ? "Det er ingen flere stemmer å legge til."
      : `Ingen stemmer matcher «${searchTerm.trim()}».`}
  </p>
{:else}
  <div class="groups">
    {#each groups as group (group.label)}
      <div class="group">
        <p class="sbb-overline group-label">{group.label}</p>
        {#each group.parts as part (part.id)}
          <button
            type="button"
            class="option"
            class:selected={isSelected(part.id!)}
            role="checkbox"
            aria-checked={isSelected(part.id!)}
            onclick={() => toggle(part.id!)}
          >
            <span class="checkbox" aria-hidden="true">
              {#if isSelected(part.id!)}
                <Check size={13} strokeWidth={3} />
              {/if}
            </span>
            <span class="option-text">
              <span class="option-name">{part.name}</span>
              {#if part.aliases?.length}
                <span class="option-aliases">{part.aliases.join(" · ")}</span>
              {/if}
            </span>
          </button>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  /* The catalogue is long, so the list scrolls inside the dialog rather than
     stretching it past the viewport. */
  .groups {
    max-height: 46vh;
    overflow-y: auto;
    padding-right: 4px;
  }
  .group + .group {
    margin-top: 18px;
  }
  .group-label {
    margin: 0 0 8px;
    color: var(--text-muted);
  }

  /* Row and check box mirror the role picker on the user edit page, so the two
     multi-selects in the same flow read as the same control. */
  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    font-family: var(--font-text);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .option + .option {
    margin-top: 6px;
  }
  .option:hover {
    border-color: var(--border-strong);
  }
  .option.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .checkbox {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--border-strong);
    color: var(--accent-on);
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .option.selected .checkbox {
    border-color: var(--accent);
    background: var(--accent);
  }
  .option-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .option-name {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
  }
  .option-aliases {
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    padding: 10px 0 6px;
    font-size: 13px;
    font-style: italic;
    color: var(--text-muted);
  }
</style>
