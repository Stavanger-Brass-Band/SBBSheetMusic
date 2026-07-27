<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    Modal,
    Dropdown,
    DropdownItem,
    DropdownDivider,
  } from "flowbite-svelte";
  import {
    EllipsisVertical,
    Pencil,
    Trash2,
    Plus,
    Search,
    Check,
    FolderOpen,
  } from "@lucide/svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { toApiDate } from "$lib/utils/date";
  import type { MusicSet, Project, UpdateProjectRequest } from "$lib/types";
  import {
    Breadcrumb,
    Button,
    SetCard,
    DateRangeBoxes,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import ProjectModalBody from "$lib/components/ProjectModalBody.svelte";
  import ProjectDescription from "$lib/components/ProjectDescription.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  const PAGE = 30;
  const ORDER = [{ field: "archiveNumber", direction: 0 as const }];

  let id = $derived(page.params.id!);

  let project = $state<Project>({
    id: "",
    name: "",
    startDate: "",
    endDate: "",
  });
  let sets = $state<MusicSet[]>([]);
  let loading = $state(true);

  // add-sets dialog (server-side OData search + offset paging)
  let addOpen = $state(false);
  let searchTerm = $state("");
  let selectedIds = $state<string[]>([]);
  let catalogItems = $state<MusicSet[]>([]);
  let loadingCatalog = $state(false);
  let loadingMore = $state(false);
  let hasMore = $state(false);
  let skip = $state(0);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  // edit dialog
  let editOpen = $state(false);
  let editFocusDescription = $state(false);
  let savingProject = $state(false);
  let draft = $state<Partial<Project>>({});
  let canSaveEdit = $derived(
    !!draft.name?.trim() && !!draft.startDate && !!draft.endDate,
  );

  // confirms
  let confirmDeleteOpen = $state(false);
  let confirmRemoveOpen = $state(false);
  let setToRemove = $state<MusicSet | null>(null);

  let attachedIds = $derived(new Set(sets.map((s) => s.id)));

  onMount(async () => {
    const [info, projectSets] = await Promise.all([
      projectsApi.get(id),
      projectsApi.getSets(id),
    ]);
    project = info;
    sets = projectSets;
    loading = false;
  });
  onDestroy(() => clearTimeout(searchTimer));

  // ---- add sets ----
  function openAdd() {
    selectedIds = [];
    searchTerm = "";
    addOpen = true;
    runCatalogSearch();
  }
  async function runCatalogSearch() {
    loadingCatalog = true;
    skip = 0;
    const res = await sheetMusic.searchSets({
      search: searchTerm.trim() || undefined,
      orderBy: ORDER,
      top: PAGE,
      skip: 0,
    });
    catalogItems = res ?? [];
    hasMore = (res?.length ?? 0) === PAGE;
    loadingCatalog = false;
  }
  async function loadMoreCatalog() {
    loadingMore = true;
    skip += PAGE;
    const res = await sheetMusic.searchSets({
      search: searchTerm.trim() || undefined,
      orderBy: ORDER,
      top: PAGE,
      skip,
    });
    catalogItems = [...catalogItems, ...(res ?? [])];
    hasMore = (res?.length ?? 0) === PAGE;
    loadingMore = false;
  }
  // Debounce keystrokes so search hits the API at most a few times per second.
  function onCatalogSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runCatalogSearch(), 300);
  }
  function toggleSelect(setId: string) {
    selectedIds = selectedIds.includes(setId)
      ? selectedIds.filter((s) => s !== setId)
      : [...selectedIds, setId];
  }
  async function confirmAdd() {
    if (selectedIds.length === 0) {
      addOpen = false;
      return;
    }
    sets = await projectsApi.addSets(id, selectedIds);
    addOpen = false;
  }

  // ---- remove a set ----
  function askRemoveSet(set: MusicSet) {
    setToRemove = set;
    confirmRemoveOpen = true;
  }
  async function removeSet() {
    const set = setToRemove;
    if (!set) return;
    const res = await projectsApi.removeSets(id, [set.id!]);
    if (res.status === 200) sets = sets.filter((s) => s.id !== set.id);
  }

  // ---- edit project ----
  // `focusDescription` is set when the dialog is opened from the description
  // card, so the caret lands in the field the admin came to change.
  function openEdit(focusDescription = false) {
    draft = {
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      comments: project.comments,
    };
    editFocusDescription = focusDescription;
    editOpen = true;
  }
  async function saveEdit() {
    if (!canSaveEdit) return;
    savingProject = true;
    const body: UpdateProjectRequest = {
      name: draft.name,
      comments: draft.comments?.trim() || null,
      startDate: toApiDate(draft.startDate!),
      endDate: toApiDate(draft.endDate!),
    };
    const res = await projectsApi.update(id, body);
    savingProject = false;
    if (res) {
      // The spec leaves the update response body undefined, so keep the
      // description we just saved rather than trust it to be echoed back.
      project = { ...res, comments: body.comments };
      editOpen = false;
    }
  }

  // ---- delete project ----
  async function removeProject() {
    const res = await projectsApi.remove(id);
    if (res.status === 204) goto("/projects");
  }
</script>

<Breadcrumb
  class="mb-4"
  items={[
    { label: "Prosjekter", href: "/projects" },
    { label: project.name ?? "-" },
  ]}
/>

{#if loading}
  <LoadingSpinner label="Laster prosjekt…" />
{:else}
  <div class="head">
    <h1 class="sbb-h1 title">{project.name}</h1>
    <div class="head__actions">
      <DateRangeBoxes start={project.startDate} end={project.endDate} />
      <button class="kebab" aria-label="Handlinger">
        <EllipsisVertical size={18} />
      </button>
      <Dropdown simple class="min-w-56">
        <DropdownItem onclick={() => openEdit()}>
          <span class="menu-row"><Pencil size={16} /> Rediger prosjekt</span>
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem
          class="text-red-400"
          onclick={() => (confirmDeleteOpen = true)}
        >
          <span class="menu-row"><Trash2 size={16} /> Slett prosjekt</span>
        </DropdownItem>
      </Dropdown>
    </div>
  </div>

  <ProjectDescription
    class="mb-9"
    description={project.comments}
    onedit={() => openEdit(true)}
  />

  <div class="secbar">
    <h2 class="sbb-h3">
      Tilknyttede notesett
      <span class="cnt">{sets.length} sett</span>
    </h2>
    <button class="addbtn" onclick={openAdd}>
      <Plus size={16} /> Legg til notesett
    </button>
  </div>

  {#if sets.length === 0}
    <div class="empty">
      <span class="ic"><FolderOpen size={38} strokeWidth={1.9} /></span>
      <div class="t">Ingen tilknyttede notesett enda</div>
      <div class="s">
        Legg til notesett fra arkivet for å bygge programmet til dette
        prosjektet.
      </div>
      <Button class="mt-5" onclick={openAdd}
        ><Plus size={16} /> Legg til notesett</Button
      >
    </div>
  {:else}
    <div class="grid">
      {#each sets as set (set.id)}
        <SetCard
          title={set.title}
          composer={set.composer}
          arranger={set.arranger}
          href={`/set/edit/${set.id}`}
          removable
          onremove={() => askRemoveSet(set)}
        />
      {/each}
      <button class="addtile" onclick={openAdd}>
        <span class="ic"><Plus size={26} /></span>
        <span class="t">Legg til notesett</span>
      </button>
    </div>
  {/if}

  <!-- Mobile: sticky primary action (see Project Edit - Mobile design). -->
  <div class="fab">
    <button class="fab__btn" onclick={openAdd}>
      <Plus size={18} /> Legg til notesett
    </button>
  </div>
{/if}

<!-- Add-sets dialog -->
<Modal title="Legg til notesett" bind:open={addOpen} size="lg">
  {#if loadingCatalog}
    <LoadingSpinner inline />
  {:else}
    <div class="setsearch">
      <span class="ico"><Search size={16} /></span>
      <input
        class="in has-ico"
        placeholder="Søk i arkivet etter tittel, komponist eller arrangør…"
        bind:value={searchTerm}
        oninput={onCatalogSearchInput}
      />
    </div>
    <div class="listhead">
      <span></span><span>Tittel</span><span>Komponist</span><span>Arrangør</span
      >
    </div>
    <div class="setlist">
      {#each catalogItems as c (c.id)}
        {@const already = attachedIds.has(c.id)}
        <button
          class="setrow"
          class:sel={selectedIds.includes(c.id ?? "")}
          class:added={already}
          disabled={already}
          onclick={() => toggleSelect(c.id ?? "")}
        >
          <span class="chk"><Check size={13} /></span>
          <span class="ttl">{c.title}</span>
          <span class="cmp">{c.composer ?? "—"}</span>
          {#if already}
            <span class="pill">I prosjektet</span>
          {:else}
            <span class="arr2">{c.arranger ?? "—"}</span>
          {/if}
        </button>
      {/each}
      {#if catalogItems.length === 0}
        <div class="noresult">Fant ingen notesett som matcher søket.</div>
      {:else if hasMore}
        <Button
          class="mt-2"
          variant="secondary"
          block
          onclick={loadMoreCatalog}
          loading={loadingMore}
        >
          Last flere
        </Button>
      {/if}
    </div>
  {/if}
  {#snippet footer()}
    <span class="sel-sum">
      {selectedIds.length ? `${selectedIds.length} sett valgt` : "Ingen valgt"}
    </span>
    <Button onclick={confirmAdd} disabled={selectedIds.length === 0}>
      <Plus size={16} /> Legg til
    </Button>
    <Button variant="ghost" onclick={() => (addOpen = false)}>Avbryt</Button>
  {/snippet}
</Modal>

<!-- Edit project dialog -->
<Modal title="Rediger prosjekt" bind:open={editOpen} size="md">
  <ProjectModalBody
    project={draft}
    withDescription
    autofocusDescription={editFocusDescription}
  />
  {#snippet footer()}
    <Button onclick={saveEdit} loading={savingProject} disabled={!canSaveEdit}>
      <Check size={16} /> Lagre
    </Button>
    <Button variant="ghost" onclick={() => (editOpen = false)}>Avbryt</Button>
  {/snippet}
</Modal>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Slette prosjektet?"
  description={`«${project.name}» og alle tilknyttinger slettes. Handlingen kan ikke reverseres.`}
  confirmTitle="Slett prosjekt"
  onconfirm={removeProject}
/>

<ConfirmDialog
  bind:open={confirmRemoveOpen}
  title="Fjern notesett?"
  description={`«${setToRemove?.title ?? ""}» fjernes fra dette prosjektet. Settet blir værende i arkivet.`}
  confirmTitle="Fjern"
  onconfirm={removeSet}
/>

<style>
  /* ---- header ---- */
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 30px;
  }
  .title {
    margin: 0;
    font-size: 40px;
  }
  .head__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
  }
  .kebab {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--dur-fast);
  }
  .kebab:hover {
    background: var(--surface-hover);
  }
  .menu-row {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
  }
  .menu-row :global(svg) {
    flex-shrink: 0;
  }

  /* ---- section bar ---- */
  .secbar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
  }
  .secbar h2 {
    margin: 0;
    font-size: 24px;
  }
  .cnt {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted);
    margin-left: 8px;
    font-weight: 400;
  }
  /* Bullet separates count from the title only while they sit inline. */
  .cnt::before {
    content: "· ";
  }
  .addbtn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 14px;
    color: var(--accent);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    white-space: nowrap;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .addbtn:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  /* Sticky mobile add action — hidden on desktop (see media query). */
  .fab {
    display: none;
  }

  /* ---- grid + add tile ---- */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(224px, 1fr));
    gap: 34px 28px;
  }
  .addtile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    aspect-ratio: 1 / 1.31;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font-text);
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast),
      color var(--dur-fast);
  }
  .addtile:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }
  .addtile .ic {
    display: inline-flex;
  }
  .addtile .t {
    font-weight: 600;
    font-size: 15px;
  }

  /* ---- empty state ---- */
  .empty {
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    padding: 52px 24px;
    text-align: center;
  }
  .empty .ic {
    color: var(--text-muted);
    display: inline-flex;
    margin-bottom: 14px;
  }
  .empty .t {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    color: var(--text-primary);
  }
  .empty .s {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 8px auto 0;
    max-width: 380px;
    line-height: 1.5;
  }

  /* ---- add-sets search input ---- */
  .in {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--text-primary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    outline: none;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .in:focus {
    border-color: var(--accent);
    box-shadow: var(--ring-focus);
  }

  /* ---- add-sets search list ---- */
  .setsearch {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 14px;
  }
  .setsearch .ico {
    position: absolute;
    left: 13px;
    color: var(--text-muted);
    display: flex;
    pointer-events: none;
  }
  .in.has-ico {
    padding-left: 40px;
  }
  .listhead {
    display: grid;
    grid-template-columns: 24px 1.4fr 1fr 1fr;
    gap: 10px;
    padding: 0 12px 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-subtle);
  }
  .setlist {
    max-height: 340px;
    overflow-y: auto;
    margin: 0 -4px;
  }
  .setrow {
    display: grid;
    grid-template-columns: 24px 1.4fr 1fr 1fr;
    gap: 10px;
    align-items: center;
    width: 100%;
    padding: 11px 12px;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--text-primary);
    font-family: var(--font-text);
    transition: background var(--dur-fast);
  }
  .setrow:hover {
    background: var(--surface-hover);
  }
  .setrow.sel {
    background: var(--accent-soft);
  }
  .setrow .chk {
    width: 20px;
    height: 20px;
    border: 1.5px solid var(--border-strong);
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    transition: all var(--dur-fast);
  }
  .setrow.sel .chk {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .setrow .ttl {
    font-weight: 600;
    font-size: 14px;
  }
  .setrow .cmp,
  .setrow .arr2 {
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .setrow .arr2 {
    color: var(--text-muted);
  }
  .setrow.added {
    opacity: 0.45;
    cursor: default;
  }
  .setrow.added:hover {
    background: transparent;
  }
  .setrow .pill {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .noresult {
    padding: 36px 12px;
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
  }
  .sel-sum {
    margin-right: auto;
    font-size: 13px;
    color: var(--text-secondary);
  }

  @media (max-width: 720px) {
    .title {
      font-size: 30px;
    }
    /* Stack the section bar: title, count subtitle, then the add button. */
    .secbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .cnt {
      display: block;
      margin-left: 0;
      margin-top: 4px;
    }
    .cnt::before {
      content: none;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 22px 16px;
    }
    /* Drop the table columns: stack composer under the title as a list row. */
    .listhead {
      display: none;
    }
    .setrow {
      grid-template-columns: 22px 1fr auto;
      grid-template-areas:
        "chk ttl pill"
        "chk cmp pill";
      column-gap: 12px;
      row-gap: 2px;
      align-items: center;
      padding: 13px 8px;
    }
    .setrow .chk {
      grid-area: chk;
      align-self: center;
    }
    .setrow .ttl {
      grid-area: ttl;
      font-size: 15px;
    }
    .setrow .cmp {
      grid-area: cmp;
      font-size: 12.5px;
    }
    .setrow .arr2 {
      display: none;
    }
    .setrow .pill {
      grid-area: pill;
      align-self: center;
    }
    .setlist {
      max-height: 56vh;
    }
    .in {
      height: 48px;
      font-size: 16px;
    }
  }

  /* Phones: a sticky primary "add" replaces the inline one, and the grid
     locks to two columns so it never collapses on the narrowest devices. */
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .addbtn {
      display: none;
    }
    .fab {
      display: block;
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
      background: linear-gradient(to top, var(--surface-page) 64%, transparent);
    }
    .fab__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 50px;
      font-family: var(--font-text);
      font-weight: 600;
      font-size: 15px;
      color: #fff;
      background: var(--accent);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--dur-fast);
    }
    .fab__btn:active {
      background: var(--accent-hover);
    }
  }
</style>
