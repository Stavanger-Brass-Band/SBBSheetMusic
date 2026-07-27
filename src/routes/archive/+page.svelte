<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { beforeNavigate, goto, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { Modal } from "flowbite-svelte";
  import {
    SearchX,
    Library,
    Plus,
    Download,
    Check,
    CheckCircle,
    Tag,
  } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { categories as categoriesApi } from "$lib/api/categories";
  import { downloadSetZip } from "$lib/utils/download";
  import type { Category, MusicSet, SetRequest } from "$lib/types";
  import MusicSetModalBody from "$lib/components/MusicSetModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { Button, Spinner, EmptyState, SearchInput } from "$lib/components/ui";

  const PAGE = 30;
  /** Ceiling when restoring `pages` from the URL — it becomes one request. */
  const MAX_RESTORED_PAGES = 20;
  /** Where the scroll offset is parked while the user is off the archive. */
  const SCROLL_KEY = "archive:scroll";

  let searchTerm = $state("");
  // Category filter: the name of the selected category, "" for all. It narrows
  // the same server-side query the search field drives.
  let selectedCategory = $state("");
  let categoryOptions = $state<Category[]>([]);
  let items = $state<MusicSet[]>([]);
  // Pages of results currently on screen. Mirrored in the URL, so "load more"
  // survives leaving the page too.
  let pagesLoaded = $state(1);
  // `loading` is the first paint only (full-page spinner). `searching` covers
  // every later (debounced) query — it shows an inline indicator in the search
  // field and keeps the current results on screen, so typing never blanks the
  // table.
  let loading = $state(true);
  let searching = $state(false);
  let loadingMore = $state(false);
  let hasMore = $state(false);

  // Id of the set whose ZIP is currently being prepared (token fetch), so its
  // download button can show a spinner.
  let downloadingId = $state<string | null>(null);
  // Id of the set whose ZIP just downloaded — shows a brief success check.
  let completedId = $state<string | null>(null);
  let completedTimer: ReturnType<typeof setTimeout> | undefined;

  let newSet = $state<Partial<MusicSet>>({});
  let isOpen = $state(false);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function fetchSets(top: number, skip: number) {
    return sheetMusic.searchSets({
      search: searchTerm.trim() || undefined,
      category: selectedCategory || undefined,
      top,
      skip,
    });
  }

  /**
   * Mirror the current view into the URL, replacing the history entry so
   * filtering never fills the back stack. Leaving the archive and coming back
   * (or reloading, or sharing the link) then lands on the same list.
   */
  function syncUrl() {
    const params: string[] = [];
    const query = searchTerm.trim();
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (selectedCategory)
      params.push(`category=${encodeURIComponent(selectedCategory)}`);
    if (pagesLoaded > 1) params.push(`pages=${pagesLoaded}`);
    replaceState(
      params.length ? `?${params.join("&")}` : page.url.pathname,
      {},
    );
  }

  async function runSearch() {
    searching = true;
    pagesLoaded = 1;
    const res = await fetchSets(PAGE, 0);
    items = res ?? [];
    hasMore = (res?.length ?? 0) === PAGE;
    syncUrl();
    searching = false;
    loading = false;
  }

  async function loadMore() {
    loadingMore = true;
    const res = await fetchSets(PAGE, pagesLoaded * PAGE);
    items = [...items, ...(res ?? [])];
    pagesLoaded += 1;
    hasMore = (res?.length ?? 0) === PAGE;
    syncUrl();
    loadingMore = false;
  }

  /** First paint: rebuild whatever the URL describes in a single request. */
  async function restoreFromUrl() {
    const params = page.url.searchParams;
    searchTerm = params.get("search") ?? "";
    selectedCategory = params.get("category") ?? "";
    pagesLoaded = parsePages(params.get("pages"));

    const top = pagesLoaded * PAGE;
    const res = await fetchSets(top, 0);
    items = res ?? [];
    hasMore = (res?.length ?? 0) === top;
    loading = false;
    restoreScroll();
  }

  function parsePages(value: string | null): number {
    const pages = Math.trunc(Number(value));
    if (!Number.isFinite(pages) || pages < 1) return 1;
    return Math.min(pages, MAX_RESTORED_PAGES);
  }

  // SvelteKit restores scroll the moment the navigation completes — before the
  // results have been fetched and rendered — so the archive keeps its own
  // offset. Keyed by the full URL, so it only ever applies to the exact view it
  // was taken from, and consumed once.
  beforeNavigate(() => {
    sessionStorage.setItem(
      SCROLL_KEY,
      JSON.stringify({ url: page.url.href, y: window.scrollY }),
    );
  });

  async function restoreScroll() {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    sessionStorage.removeItem(SCROLL_KEY);
    if (!saved) return;
    try {
      const { url, y } = JSON.parse(saved) as { url: string; y: number };
      if (url !== page.url.href) return;
      await tick();
      window.scrollTo(0, y);
    } catch {
      // A malformed entry just means starting at the top of the list.
    }
  }

  /**
   * The category catalog drives the filter row. It is not deployed to every
   * environment yet, so a failure just leaves the archive without a filter
   * rather than breaking the page.
   */
  async function loadCategories() {
    try {
      const result = await categoriesApi.list();
      categoryOptions = (result ?? [])
        .filter((category) => !category.inactive)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "nb-NO"));
    } catch {
      categoryOptions = [];
    }
  }

  // Clicking the active category clears the filter, so a chip toggles.
  function selectCategory(name: string) {
    selectedCategory = selectedCategory === name ? "" : name;
    runSearch();
  }

  // "Ingen treff" covers a text search, a category filter, or both.
  let emptyResultDescription = $derived.by(() => {
    const query = searchTerm.trim();
    if (query && selectedCategory)
      return `Fant ingen notesett i «${selectedCategory}» som matcher «${query}». Prøv et annet søk eller en annen kategori.`;
    if (query)
      return `Fant ingen notesett som matcher «${query}». Prøv et annet søk.`;
    return `Ingen notesett er merket med «${selectedCategory}» enda.`;
  });

  // Debounce keystrokes so search hits the API at most a few times per second.
  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(), 300);
  }

  async function downloadZip(item: MusicSet) {
    downloadingId = item.id ?? null;
    try {
      await downloadSetZip(item.id!, item.zipDownloadUrl ?? "");
      completedId = item.id ?? null;
      clearTimeout(completedTimer);
      completedTimer = setTimeout(() => (completedId = null), 1600);
    } finally {
      downloadingId = null;
    }
  }

  onMount(() => {
    restoreFromUrl();
    loadCategories();
  });
  onDestroy(() => {
    clearTimeout(searchTimer);
    clearTimeout(completedTimer);
  });

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

<!-- Categories sit under the title as a quiet overline so the title keeps the
     focus in a dense list. -->
{#snippet categoryTags(tags: Category[] | null | undefined)}
  {#if tags?.length}
    <span class="row-cats">
      {#each tags as category (category.id)}
        <span class="row-cat">{category.name}</span>
      {/each}
    </span>
  {/if}
{/snippet}

<div class="sbb-list-head">
  <h1 class="sbb-h1">Arkivliste</h1>
  {#if auth.isAdmin}
    <Button class="create-btn" onclick={openModal}>
      <Plus size={17} /> Nytt notesett
    </Button>
  {/if}
</div>

<SearchInput
  placeholder="Søk i arkivet…"
  bind:value={searchTerm}
  {searching}
  oninput={onSearchInput}
/>

{#if categoryOptions.length > 0}
  <div class="filters">
    <span class="filters-label"><Tag size={14} /> Kategori</span>
    <button
      class="filter-chip"
      class:active={!selectedCategory}
      onclick={() => selectCategory("")}
    >
      Alle
    </button>
    {#each categoryOptions as category (category.id)}
      <button
        class="filter-chip"
        class:active={selectedCategory === category.name}
        onclick={() => selectCategory(category.name ?? "")}
      >
        {category.name}
      </button>
    {/each}
  </div>
{/if}

{#if loading}
  <LoadingSpinner label="Laster arkiv…" />
{:else if items.length === 0}
  {#if searchTerm.trim() || selectedCategory}
    <EmptyState title="Ingen treff" description={emptyResultDescription}>
      {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Arkivet er tomt"
      description="Det er ingen notesett her enda."
    >
      {#snippet icon()}<Library size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
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
            <td class="c-title">
              {item.title}
              {@render categoryTags(item.categories)}
            </td>
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
                    {:else if completedId === item.id}
                      <span class="ok"><Check size={15} /></span> Zip
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
          {@render categoryTags(item.categories)}
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
                {:else if completedId === item.id}
                  <span class="ok"><Check size={15} /></span> Zip
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
  /* ---- category filter ---- */
  .filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }
  .filters-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-right: 4px;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  .filter-chip {
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
  .filter-chip:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }
  .filter-chip.active {
    color: var(--accent-on);
    background: var(--accent);
    border-color: var(--accent);
  }

  /* Category tags under a set's title (table cell and mobile card alike). */
  .row-cats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 8px;
    margin-top: 4px;
  }
  .row-cat {
    font-size: 12.5px;
    font-weight: 400;
    color: var(--text-muted);
  }
  /* A bullet so two names never read as one label. */
  .row-cat + .row-cat::before {
    content: "";
    display: inline-block;
    width: 3px;
    height: 3px;
    margin-right: 8px;
    vertical-align: middle;
    border-radius: 50%;
    background: var(--gray-500);
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
  /* Success check shown briefly inside the ZIP button after a download. */
  .zip .ok {
    display: inline-flex;
    color: var(--success);
    animation: tile-check-pop var(--dur-base) var(--ease-out);
  }
  @keyframes tile-check-pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
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
