<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
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
  import { setRouteFor } from "$lib/utils/setRoute";
  import {
    PAGE_SIZE,
    isSameSort,
    parsePagesParam,
    readSortParams,
    replaceListUrl,
    toOrderByClause,
    toggleSort,
    type SortState,
  } from "$lib/utils/listQuery";
  import type { Category, MusicSet, SetRequest } from "$lib/types";
  import MusicSetModalBody from "$lib/components/MusicSetModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import {
    Button,
    Spinner,
    EmptyState,
    SearchInput,
    SortableTableHeader,
  } from "$lib/components/ui";

  /** The set columns the API can sort on — see `readSortParams`. */
  const SORTABLE_FIELDS = [
    "archiveNumber",
    "title",
    "composer",
    "arranger",
  ] as const;
  const DEFAULT_SORT: SortState = {
    field: "archiveNumber",
    direction: "desc",
  };
  /**
   * Category chips shown before the row collapses behind "+N flere". Chips wrap
   * after about ten on a desktop but only three on a phone, so the cut-off
   * follows the viewport — otherwise a vocabulary of 20 pushes the list itself
   * off screen on mobile.
   */
  const VISIBLE_CATEGORY_CHIPS = 8;
  const VISIBLE_CATEGORY_CHIPS_NARROW = 4;
  /** The same breakpoint the table/card-list swap uses. */
  const NARROW_VIEWPORT = "(max-width: 640px)";
  /** Where the scroll offset is parked while the user is off the archive. */
  const SCROLL_KEY = "archive:scroll";

  let searchTerm = $state("");
  // Category filter: the name of the selected category, "" for all. It narrows
  // the same server-side query the search field drives.
  let selectedCategory = $state("");
  let categoryOptions = $state<Category[]>([]);
  let showAllCategories = $state(false);
  let isNarrowViewport = $state(false);
  let items = $state<MusicSet[]>([]);
  // Column the list is sorted by. Server-side, like the search and the paging,
  // and mirrored in the URL alongside them.
  let sort = $state<SortState>(DEFAULT_SORT);
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
  // Why the last download didn't happen, if it didn't. Says nothing about the
  // set — a refused download tells us nothing about it.
  let downloadError = $state("");

  let newSet = $state<Partial<MusicSet>>({});
  let isOpen = $state(false);
  let isSaving = $state(false);
  let createError = $state("");
  // Title is the only field the API requires; everything else may be filled in
  // later on the editor page.
  let canSave = $derived(!!newSet.title?.trim());

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function fetchSets(top: number, skip: number) {
    return sheetMusic.searchSets({
      search: searchTerm.trim() || undefined,
      category: selectedCategory || undefined,
      orderBy: toOrderByClause(sort),
      top,
      skip,
    });
  }

  /**
   * Mirror the current view into the URL (see `replaceListUrl`). Leaving the
   * archive and coming back — or reloading, or sharing the link — then lands on
   * the same list. The sort is left out while it matches the default, so the
   * plain archive keeps a clean URL.
   */
  function syncUrl() {
    const params: string[] = [];
    const query = searchTerm.trim();
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (selectedCategory)
      params.push(`category=${encodeURIComponent(selectedCategory)}`);
    if (!isSameSort(sort, DEFAULT_SORT))
      params.push(`sort=${sort.field}`, `dir=${sort.direction}`);
    if (pagesLoaded > 1) params.push(`pages=${pagesLoaded}`);
    replaceListUrl(params, page.url.pathname);
  }

  async function runSearch() {
    searching = true;
    pagesLoaded = 1;
    const res = await fetchSets(PAGE_SIZE, 0);
    items = res ?? [];
    hasMore = (res?.length ?? 0) === PAGE_SIZE;
    syncUrl();
    searching = false;
    loading = false;
  }

  async function loadMore() {
    loadingMore = true;
    const res = await fetchSets(PAGE_SIZE, pagesLoaded * PAGE_SIZE);
    items = [...items, ...(res ?? [])];
    pagesLoaded += 1;
    hasMore = (res?.length ?? 0) === PAGE_SIZE;
    syncUrl();
    loadingMore = false;
  }

  /** First paint: rebuild whatever the URL describes in a single request. */
  async function restoreFromUrl() {
    const params = page.url.searchParams;
    searchTerm = params.get("search") ?? "";
    selectedCategory = params.get("category") ?? "";
    sort = readSortParams(params, SORTABLE_FIELDS, DEFAULT_SORT);
    pagesLoaded = parsePagesParam(params.get("pages"));

    const top = pagesLoaded * PAGE_SIZE;
    const res = await fetchSets(top, 0);
    items = res ?? [];
    hasMore = (res?.length ?? 0) === top;
    loading = false;
    restoreScroll();
  }

  // The API does the sorting, so a header click re-runs the query — and starts
  // over at page one, since the rows already loaded are no longer the first
  // ones under the new order.
  function changeSort(field: string) {
    sort = toggleSort(sort, field);
    runSearch();
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

  // Clicking the active category clears the filter, so a chip toggles. Picking
  // one also folds the row back up, so the results are never pushed off screen
  // by an expanded list of chips.
  function selectCategory(name: string) {
    selectedCategory = selectedCategory === name ? "" : name;
    showAllCategories = false;
    runSearch();
  }

  let visibleCategories = $derived.by(() => {
    if (showAllCategories) return categoryOptions;
    const limit = isNarrowViewport
      ? VISIBLE_CATEGORY_CHIPS_NARROW
      : VISIBLE_CATEGORY_CHIPS;
    const visible = categoryOptions.slice(0, limit);
    // Keep the active filter on screen even when it sorts past the cut-off.
    const selected = categoryOptions.find(
      (category) => category.name === selectedCategory,
    );
    if (selected && !visible.includes(selected)) visible.push(selected);
    return visible;
  });
  let hiddenCategoryCount = $derived(
    categoryOptions.length - visibleCategories.length,
  );

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

  function openSet(item: MusicSet) {
    const route = item.id && setRouteFor(item.id, auth);
    if (route) goto(route);
  }

  async function downloadZip(item: MusicSet) {
    downloadingId = item.id ?? null;
    downloadError = "";
    try {
      const outcome = await downloadSetZip(item.id!, item.zipDownloadUrl ?? "");
      if (outcome === "forbidden") {
        downloadError = "Du har ikke tilgang til å laste ned dette notesettet.";
        return;
      }
      if (outcome === "failed") {
        downloadError = "Nedlastingen feilet. Prøv igjen.";
        return;
      }
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

    // Follow the breakpoint live, so rotating a phone or resizing re-folds the
    // chip row instead of leaving the wrong cut-off behind.
    const narrow = window.matchMedia(NARROW_VIEWPORT);
    isNarrowViewport = narrow.matches;
    const onViewportChange = (event: MediaQueryListEvent) =>
      (isNarrowViewport = event.matches);
    narrow.addEventListener("change", onViewportChange);
    return () => narrow.removeEventListener("change", onViewportChange);
  });
  onDestroy(() => {
    clearTimeout(searchTimer);
    clearTimeout(completedTimer);
  });

  /**
   * The editor page is reached by id, so the create only counts as done once
   * the API has answered with one — a rejected create leaves the dialog open
   * with what was typed still in it, rather than navigating to an id that
   * doesn't exist.
   */
  async function saveNewSet() {
    if (!canSave) return;
    isSaving = true;
    createError = "";
    const created = await sheetMusic.createSet(newSet as SetRequest);
    isSaving = false;
    if (created?.id) {
      isOpen = false;
      goto("/set/edit/" + created.id);
    } else {
      createError = "Kunne ikke lagre notesettet. Prøv igjen.";
    }
  }

  function openModal() {
    newSet = {};
    createError = "";
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
  {#if auth.canManageMusic}
    <Button class="create-btn" onclick={openModal}>
      <Plus size={17} /> Nytt notesett
    </Button>
  {/if}
</div>

<!-- A Musikant is served only the sets on a running project, so without saying so
     the list reads as an archive with most of it missing. -->
{#if !auth.canReadLibrary}
  <p class="scope-note">
    Du ser notesettene som hører til aktive prosjekt. Ta kontakt med en
    administrator for tilgang til hele arkivet.
  </p>
{/if}

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
    {#each visibleCategories as category (category.id)}
      <button
        class="filter-chip"
        class:active={selectedCategory === category.name}
        onclick={() => selectCategory(category.name ?? "")}
      >
        {category.name}
      </button>
    {/each}
    {#if hiddenCategoryCount > 0}
      <button
        class="filter-chip toggle"
        onclick={() => (showAllCategories = true)}
      >
        +{hiddenCategoryCount} flere
      </button>
    {:else if showAllCategories}
      <button
        class="filter-chip toggle"
        onclick={() => (showAllCategories = false)}
      >
        Vis færre
      </button>
    {/if}
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
  {#if downloadError}
    <p class="error-message download-error">{downloadError}</p>
  {/if}

  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <SortableTableHeader
            field="archiveNumber"
            label="Nr."
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="title"
            label="Tittel"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="composer"
            label="Komponist"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="arranger"
            label="Arrangør"
            {sort}
            onsort={changeSort}
          />
          <th class="c-actions"
            >{auth.canReadLibrary ? "Handling" : "Digitalt"}</th
          >
        </tr>
      </thead>
      <tbody>
        {#each items as item (item.id)}
          <tr
            class:clickable={auth.canManageMusic || auth.canReadLibrary}
            onclick={() => openSet(item)}
          >
            <td class="c-nr">{item.archiveNumber}</td>
            <td class="c-title">
              {item.title}
              {@render categoryTags(item.categories)}
            </td>
            <td class="c-muted">{item.composer ?? "—"}</td>
            <td class="c-muted">{item.arranger ?? "—"}</td>
            <td class="c-actions">
              {#if item.hasBeenScanned}
                <!-- The whole-set ZIP is a quick action alongside opening the
                     row for individual parts — both are the library reader's;
                     a Musikant picks parts from the project view instead. -->
                {#if auth.canReadLibrary}
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
        class:clickable={auth.canManageMusic || auth.canReadLibrary}
        onclick={() => openSet(item)}
      >
        <div class="body">
          <div class="t">
            <span class="card-nr">{item.archiveNumber}</span> - {item.title}
          </div>
          <div class="meta">
            {item.composer ?? "—"}{item.arranger
              ? " · Arr. " + item.arranger
              : ""}
          </div>
          {@render categoryTags(item.categories)}
        </div>
        <!-- No whole-set ZIP action on a phone — a folder of part PDFs is of
             little use there — but the card still opens onto individual parts
             for a library reader, so the card only reports scan status. -->
        <div class="acts">
          {#if item.hasBeenScanned}
            <span class="check"><CheckCircle size={18} /></span>
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
  {#if createError}
    <p class="error-message">{createError}</p>
  {/if}
  {#snippet footer()}
    <Button loading={isSaving} disabled={!canSave} onclick={saveNewSet}>
      Lagre
    </Button>
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
  /* The expand/collapse control reads as a link, not another category. */
  .filter-chip.toggle {
    padding: 0 6px;
    color: var(--text-muted);
    border-color: transparent;
  }
  .filter-chip.toggle:hover {
    color: var(--text-primary);
    border-color: transparent;
    text-decoration: underline;
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

  /* Only the body cells carry this — the header is a `SortableTableHeader`
     component, which scoped styles can't reach. The width still sizes the whole
     column from here. */
  .c-nr {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
    width: 72px;
  }
  .c-title {
    font-weight: 500;
  }
  /* Mobile card: the archive number rides along in the title line, where it
     keeps the mono treatment it has in the table's own column. */
  .card-nr {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
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
    white-space: nowrap;
  }
  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }
  /* The list's own copy of it sits above the table, not under a dialog field. */
  .download-error {
    margin: 0 0 14px;
  }
  /* Pulled up under the heading, which brings its own 24px of space. */
  .scope-note {
    margin: -12px 0 20px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
  }
</style>
