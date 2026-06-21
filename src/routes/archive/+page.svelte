<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { Modal } from "flowbite-svelte";
  import { Search, Plus, Download, CheckCircle } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { downloadSetZip } from "$lib/utils/download";
  import type { MusicSet, SetRequest } from "$lib/types";
  import MusicSetModalBody from "$lib/components/MusicSetModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { Button, Spinner } from "$lib/components/ui";

  const PAGE = 30;
  const ORDER = [{ field: "archiveNumber", direction: 0 as const }];

  let searchTerm = $state("");
  let items = $state<MusicSet[]>([]);
  let skip = $state(0);
  let loading = $state(true);
  let loadingMore = $state(false);
  let hasMore = $state(false);

  // Id of the set whose ZIP is currently being prepared (token fetch), so its
  // download button can show a spinner.
  let downloadingId = $state<string | null>(null);

  let newSet = $state<Partial<MusicSet>>({});
  let isOpen = $state(false);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  async function runSearch() {
    loading = true;
    skip = 0;
    const res = await sheetMusic.searchSets({
      search: searchTerm.trim() || undefined,
      orderBy: ORDER,
      top: PAGE,
      skip: 0,
    });
    items = res ?? [];
    hasMore = (res?.length ?? 0) === PAGE;
    loading = false;
  }

  async function loadMore() {
    loadingMore = true;
    skip += PAGE;
    const res = await sheetMusic.searchSets({
      search: searchTerm.trim() || undefined,
      orderBy: ORDER,
      top: PAGE,
      skip,
    });
    items = [...items, ...(res ?? [])];
    hasMore = (res?.length ?? 0) === PAGE;
    loadingMore = false;
  }

  // Debounce keystrokes so search hits the API at most a few times per second.
  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(), 300);
  }

  async function downloadZip(item: MusicSet) {
    downloadingId = item.id ?? null;
    try {
      await downloadSetZip(item.id!, item.zipDownloadUrl ?? "");
    } finally {
      downloadingId = null;
    }
  }

  onMount(() => runSearch());
  onDestroy(() => clearTimeout(searchTimer));

  async function saveNewSet() {
    const result = await sheetMusic.createSet(newSet as SetRequest);
    if (result) {
      isOpen = false;
      goto("/set/edit/" + result.id);
    }
  }

  function openModal() {
    newSet = {};
    isOpen = true;
  }
</script>

<div class="sbb-list-head">
  <h1 class="sbb-h1">Arkivliste</h1>
  {#if auth.isAdmin}
    <Button class="create-btn" onclick={openModal}>
      <Plus size={17} /> Nytt notesett
    </Button>
  {/if}
</div>

<div class="search">
  <span class="search-icon"><Search size={18} /></span>
  <input
    type="text"
    placeholder="Søk i arkivet…"
    bind:value={searchTerm}
    oninput={onSearchInput}
  />
</div>

{#if loading}
  <LoadingSpinner label="Laster arkiv…" />
{:else if items.length === 0}
  <p class="empty">
    {searchTerm.trim()
      ? `Fant ingen notesett som matcher «${searchTerm.trim()}».`
      : "Arkivet er tomt."}
  </p>
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <th class="c-nr">Nr.</th>
          <th>Tittel</th>
          <th>Komponist</th>
          <th>Arrangør</th>
          <th class="c-actions">{auth.isAdmin ? "Handling" : "Digitalt"}</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item (item.id)}
          <tr
            class:clickable={auth.isAdmin}
            onclick={() => (auth.isAdmin ? goto("/set/edit/" + item.id) : null)}
          >
            <td class="c-nr">{item.archiveNumber}</td>
            <td class="c-title">{item.title}</td>
            <td class="c-muted">{item.composer ?? "—"}</td>
            <td class="c-muted"
              >{item.arranger ? "Arr. " + item.arranger : "—"}</td
            >
            <td class="c-actions">
              {#if item.hasBeenScanned}
                {#if auth.isAdmin}
                  <button
                    class="zip"
                    title="Last ned som ZIP"
                    disabled={downloadingId === item.id}
                    onclick={(e) => {
                      e.stopPropagation();
                      downloadZip(item);
                    }}
                  >
                    {#if downloadingId === item.id}
                      <Spinner size={15} inline /> Zip
                    {:else}
                      <Download size={15} /> Zip
                    {/if}
                  </button>
                {:else}
                  <span class="check"><CheckCircle size={18} /></span>
                {/if}
              {:else}
                <span class="dash">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list (see Archive List - Mobile design). -->
  <div class="sbb-card-list">
    {#each items as item (item.id)}
      <div
        class="sbb-card"
        class:clickable={auth.isAdmin}
        onclick={() => (auth.isAdmin ? goto("/set/edit/" + item.id) : null)}
      >
        <span class="nr">{item.archiveNumber}</span>
        <div class="body">
          <div class="t">{item.title}</div>
          <div class="meta">
            {item.composer ?? "—"}{item.arranger
              ? " · Arr. " + item.arranger
              : ""}
          </div>
        </div>
        <div class="acts">
          {#if item.hasBeenScanned}
            {#if auth.isAdmin}
              <button
                class="zip"
                title="Last ned som ZIP"
                disabled={downloadingId === item.id}
                onclick={(e) => {
                  e.stopPropagation();
                  downloadZip(item);
                }}
              >
                {#if downloadingId === item.id}
                  <Spinner size={15} inline /> Zip
                {:else}
                  <Download size={15} /> Zip
                {/if}
              </button>
            {:else}
              <span class="check"><CheckCircle size={18} /></span>
            {/if}
          {:else}
            <span class="dash">—</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="footer">
    <span class="sbb-mono count">
      Viser {items.length} notesett{hasMore ? "+" : ""}
    </span>
    {#if hasMore}
      <Button variant="secondary" onclick={loadMore} loading={loadingMore}>
        Last flere
      </Button>
    {/if}
  </div>
{/if}

<Modal title="Registrer nytt notesett" bind:open={isOpen} size="sm">
  <MusicSetModalBody set={newSet} />
  {#snippet footer()}
    <Button onclick={saveNewSet}>Lagre</Button>
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
  {/snippet}
</Modal>

<style>
  .empty {
    color: var(--text-muted);
  }
  .search {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  .search-icon {
    position: absolute;
    left: 16px;
    color: var(--text-muted);
    display: flex;
  }
  .search input {
    width: 100%;
    height: 48px;
    padding: 0 16px 0 46px;
    font-family: var(--font-text);
    font-size: 15px;
    color: var(--text-primary);
    background: var(--surface-card);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    outline: none;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(234, 91, 12, 0.18);
  }
  .c-nr {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
    width: 72px;
  }
  .c-title {
    font-weight: 500;
  }
  .c-muted {
    color: var(--text-secondary);
  }
  .c-actions {
    width: 130px;
    text-align: right;
    white-space: nowrap;
  }
  .zip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary);
    background: var(--surface-card);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--dur-fast);
  }
  .zip:hover {
    background: var(--surface-hover);
  }
  .zip:disabled {
    cursor: progress;
    opacity: 0.7;
  }
  .zip:disabled:hover {
    background: var(--surface-card);
  }
  .check {
    display: inline-flex;
    color: var(--success);
  }
  .dash {
    color: var(--text-muted);
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 20px;
  }
  .count {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
