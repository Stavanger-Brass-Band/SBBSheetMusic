<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { Modal } from "flowbite-svelte";
  import { Plus, SearchX, FolderOpen } from "@lucide/svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { formatDmy, projectStatus, toApiDate } from "$lib/utils/date";
  import type { ProjectStatus } from "$lib/utils/date";
  import {
    PAGE_SIZE,
    isSameSort,
    parsePagesParam,
    readSortParams,
    toOrderByClause,
    toggleSort,
    type SortState,
  } from "$lib/utils/listQuery";
  import type { NewProjectRequest, Project } from "$lib/types";
  import {
    Badge,
    Button,
    EmptyState,
    SearchInput,
    SortableTableHeader,
  } from "$lib/components/ui";
  import type { ComponentProps } from "svelte";
  import ProjectModalBody from "$lib/components/ProjectModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  // Maps a project's lifecycle phase to its status-tag label and colour.
  const statusBadge: Record<
    ProjectStatus,
    { label: string; variant: ComponentProps<typeof Badge>["variant"] }
  > = {
    upcoming: { label: "Kommende", variant: "info" },
    active: { label: "Aktiv", variant: "success" },
    ended: { label: "Avsluttet", variant: "neutral" },
  };

  /**
   * The project columns the API can sort on. Status is left out on purpose —
   * it's derived from the two dates (see `projectStatus`), not a field the
   * endpoint knows about.
   */
  const SORTABLE_FIELDS = ["name", "startDate", "endDate"] as const;
  const DEFAULT_SORT: SortState = { field: "startDate", direction: "desc" };

  let projects = $state<Project[]>([]);
  // Search, sort and paging all happen server-side through the endpoint's OData
  // query options, and are mirrored in the URL so the view survives leaving the
  // list and coming back.
  let searchTerm = $state("");
  let sort = $state<SortState>(DEFAULT_SORT);
  let pagesLoaded = $state(1);
  // `loading` is the first paint only (full-page spinner). `searching` covers
  // every later (debounced) query — it shows an inline indicator in the search
  // field and keeps the current rows on screen, so typing never blanks the
  // table.
  let loading = $state(true);
  let searching = $state(false);
  let loadingMore = $state(false);
  let hasMore = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  let newProject = $state<Partial<Project>>({});
  let isOpen = $state(false);
  let isSaving = $state(false);
  let canSave = $derived(
    !!newProject.name?.trim() && !!newProject.startDate && !!newProject.endDate,
  );

  function fetchProjects(top: number, skip: number) {
    return projectsApi.search({
      search: searchTerm.trim() || undefined,
      orderBy: toOrderByClause(sort),
      top,
      skip,
    });
  }

  /**
   * Mirror the current view into the URL, replacing the history entry so
   * searching and sorting never fill the back stack. The sort is left out while
   * it matches the default, so the plain list keeps a clean URL.
   */
  function syncUrl() {
    const params: string[] = [];
    const query = searchTerm.trim();
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (!isSameSort(sort, DEFAULT_SORT))
      params.push(`sort=${sort.field}`, `dir=${sort.direction}`);
    if (pagesLoaded > 1) params.push(`pages=${pagesLoaded}`);
    replaceState(
      params.length ? `?${params.join("&")}` : page.url.pathname,
      {},
    );
  }

  async function runSearch() {
    searching = true;
    pagesLoaded = 1;
    const result = await fetchProjects(PAGE_SIZE, 0);
    projects = result ?? [];
    hasMore = (result?.length ?? 0) === PAGE_SIZE;
    syncUrl();
    searching = false;
    loading = false;
  }

  async function loadMore() {
    loadingMore = true;
    const result = await fetchProjects(PAGE_SIZE, pagesLoaded * PAGE_SIZE);
    projects = [...projects, ...(result ?? [])];
    pagesLoaded += 1;
    hasMore = (result?.length ?? 0) === PAGE_SIZE;
    syncUrl();
    loadingMore = false;
  }

  /** First paint: rebuild whatever the URL describes in a single request. */
  async function restoreFromUrl() {
    const params = page.url.searchParams;
    searchTerm = params.get("search") ?? "";
    sort = readSortParams(params, SORTABLE_FIELDS, DEFAULT_SORT);
    pagesLoaded = parsePagesParam(params.get("pages"));

    const top = pagesLoaded * PAGE_SIZE;
    const result = await fetchProjects(top, 0);
    projects = result ?? [];
    hasMore = (result?.length ?? 0) === top;
    loading = false;
  }

  // The API does the sorting, so a header click re-runs the query — and starts
  // over at page one, since the rows already loaded are no longer the first
  // ones under the new order.
  function changeSort(field: string) {
    sort = toggleSort(sort, field);
    runSearch();
  }

  // Debounce keystrokes so search hits the API at most a few times per second.
  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(), 300);
  }

  onMount(() => {
    restoreFromUrl();
  });
  onDestroy(() => clearTimeout(searchTimer));

  async function saveNewProject() {
    if (!canSave) return;
    isSaving = true;
    const body: NewProjectRequest = {
      name: newProject.name,
      startDate: toApiDate(newProject.startDate!),
      endDate: toApiDate(newProject.endDate!),
    };

    const result = await projectsApi.create(body);
    isSaving = false;
    if (result) {
      isOpen = false;
      goto("/project/edit/" + result.id);
    }
  }

  function openModal() {
    newProject = {};
    isOpen = true;
  }
</script>

<div class="sbb-list-head">
  <h1 class="sbb-h1">Prosjekter</h1>
  <Button class="create-btn" onclick={openModal}>
    <Plus size={17} /> Nytt prosjekt
  </Button>
</div>

<SearchInput
  placeholder="Søk i prosjekter…"
  bind:value={searchTerm}
  {searching}
  oninput={onSearchInput}
/>

{#if loading}
  <LoadingSpinner label="Laster prosjekter…" />
{:else if projects.length === 0}
  {#if searchTerm.trim()}
    <EmptyState
      title="Ingen treff"
      description={`Fant ingen prosjekter som matcher «${searchTerm.trim()}». Prøv et annet søk.`}
    >
      {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Ingen prosjekter ennå"
      description="Opprett det første prosjektet for å samle noter til en konsert."
    >
      {#snippet icon()}<FolderOpen size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <SortableTableHeader
            field="name"
            label="Navn"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="startDate"
            label="Startdato"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="endDate"
            label="Sluttdato"
            {sort}
            onsort={changeSort}
          />
          <th class="c-status">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each projects as project (project.id)}
          {@const status = statusBadge[projectStatus(project)]}
          <tr
            class="clickable"
            onclick={() => goto("/project/edit/" + project.id)}
          >
            <td class="c-name">{project.name}</td>
            <td class="c-date">{formatDmy(project.startDate)}</td>
            <td class="c-date">{formatDmy(project.endDate)}</td>
            <td class="c-status">
              <Badge variant={status.variant} dot>{status.label}</Badge>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each projects as project (project.id)}
      {@const status = statusBadge[projectStatus(project)]}
      <div
        class="sbb-card clickable"
        onclick={() => goto("/project/edit/" + project.id)}
      >
        <div class="body">
          <div class="t">{project.name}</div>
          <div class="meta">
            {formatDmy(project.startDate)} – {formatDmy(project.endDate)}
          </div>
        </div>
        <div class="acts">
          <Badge variant={status.variant} dot>{status.label}</Badge>
        </div>
      </div>
    {/each}
  </div>

  <div class="footer">
    <span class="sbb-mono count">
      Viser {projects.length} prosjekter{hasMore ? "+" : ""}
    </span>
    {#if hasMore}
      <Button variant="secondary" onclick={loadMore} loading={loadingMore}>
        Last flere
      </Button>
    {/if}
  </div>
{/if}

<Modal title="Nytt prosjekt" bind:open={isOpen} size="md">
  <ProjectModalBody project={newProject} />
  {#snippet footer()}
    <Button loading={isSaving} disabled={!canSave} onclick={saveNewProject}>
      Lagre
    </Button>
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
  {/snippet}
</Modal>

<style>
  .c-name {
    font-weight: 500;
  }
  /* Widths live on the body cells: the headers are `SortableTableHeader`
     components, which scoped styles can't reach. */
  .c-date {
    width: 150px;
    color: var(--text-secondary);
  }
  .c-status {
    width: 130px;
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
