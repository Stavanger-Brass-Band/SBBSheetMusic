<script lang="ts">
  import { onMount } from "svelte";
  import { History } from "@lucide/svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import {
    formatUsagePeriod,
    toSetProjectHistory,
  } from "$lib/utils/setProjectHistory";
  import type { SetProjectUsage } from "$lib/types";
  import { Spinner } from "$lib/components/ui";

  /**
   * Where a set has been played: one row per project it is connected to, newest
   * first, each linking on to the project itself.
   *
   * It loads its own data because it is nobody else's concern — the pages that
   * show it have already fetched the set by the time it mounts, and a second
   * request has no business holding up the parts and downloads people came for.
   */
  let {
    setId,
    archiveNumber,
  }: {
    /**
     * Both come off the loaded set rather than the route, which identifies a set
     * by guid, archive number *or* title — the guid is what the row that comes
     * back is checked against, and the archive number is what it is asked for
     * (see `listSetProjects`). Both are optional the way the set response types
     * them; without either there is nothing to ask, and the panel says the
     * history couldn't be read rather than that there is none.
     */
    setId: string | undefined;
    archiveNumber: number | undefined;
  } = $props();

  let usages = $state<SetProjectUsage[]>([]);
  let loading = $state(true);
  let loadFailed = $state(false);

  onMount(loadHistory);

  async function loadHistory() {
    try {
      if (!setId || archiveNumber === undefined) {
        loadFailed = true;
        return;
      }

      const summaries = await sheetMusic.listSetProjects(setId, archiveNumber);
      if (!summaries) {
        loadFailed = true;
        return;
      }

      usages = toSetProjectHistory(summaries);
    } finally {
      loading = false;
    }
  }
</script>

<section class="history">
  <div class="history__head">
    <h2><History size={17} /> Prosjekthistorikk</h2>
    {#if usages.length > 0}
      <span class="sbb-mono history__count">
        {usages.length}
        {usages.length === 1 ? "prosjekt" : "prosjekter"}
      </span>
    {/if}
  </div>

  <div class="history__body">
    {#if loading}
      <p class="note">
        <Spinner size={14} inline /> Laster prosjekthistorikk…
      </p>
    {:else if loadFailed}
      <p class="note note--error">
        Kunne ikke hente hvilke prosjekter settet har vært brukt i. Last siden
        på nytt for å prøve igjen.
      </p>
    {:else if usages.length === 0}
      <p class="note">Settet har ikke vært brukt i noe prosjekt enda.</p>
    {:else}
      <ol class="usages">
        {#each usages as usage (usage.id)}
          <li class="usage">
            <a class="usage__name" href="/project/{usage.id}">{usage.name}</a>
            <span class="usage__period sbb-mono"
              >{formatUsagePeriod(usage)}</span
            >
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</section>

<style>
  .history {
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
  .history__head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .history__head h2 {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    color: var(--text-primary);
  }
  .history__count {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
  }
  .history__body {
    padding: 8px 20px 12px;
  }

  .note {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    padding: 10px 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
  .note--error {
    color: var(--danger);
  }

  .usages {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /**
   * Name over period rather than side by side: a project name can be any length,
   * and the panel is at its narrowest in the editor's right-hand column, where a
   * shared line leaves the dates fighting the name for room.
   */
  .usage {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 11px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .usage:last-child {
    border-bottom: none;
  }
  .usage__name {
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 15px;
    line-height: 1.35;
    color: var(--text-primary);
    text-decoration: none;
  }
  .usage__name:hover {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .usage__period {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    .history__head {
      padding: 15px 16px;
    }
    .history__head h2 {
      font-size: 19px;
    }
    .history__body {
      padding: 6px 16px 10px;
    }
  }
</style>
