<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { flip } from "svelte/animate";
  import { fly } from "svelte/transition";
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
    GripVertical,
    ArrowUpDown,
    CircleCheck,
    FolderX,
  } from "@lucide/svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { catalogData } from "$lib/api/client";
  import { toApiDate } from "$lib/utils/date";
  import { moveItem, isSameOrder } from "$lib/utils/reorder";
  import { reorderFlip, toastEnter } from "$lib/utils/motion";
  import type { MusicSet, Project, UpdateProjectRequest } from "$lib/types";
  import {
    Breadcrumb,
    Button,
    SetCard,
    DateRangeBoxes,
    EmptyState,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import ProjectModalBody, {
    isProjectDraftValid,
  } from "$lib/components/ProjectModalBody.svelte";
  import ProjectDescription from "$lib/components/ProjectDescription.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import SetOrderList from "$lib/components/SetOrderList.svelte";

  const PAGE = 30;

  let id = $derived(page.params.id!);

  let project = $state<Project>({
    id: "",
    name: "",
    startDate: "",
    endDate: "",
  });
  let sets = $state<MusicSet[]>([]);
  let loading = $state(true);
  // The project is the page. `project` stays a plain object so the markup below
  // can read it without guarding every field, so the failed load needs saying
  // separately.
  let loadFailed = $state(false);

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
  let editError = $state("");
  let canSaveEdit = $derived(isProjectDraftValid(draft));

  // confirms
  let confirmDeleteOpen = $state(false);
  let confirmRemoveOpen = $state(false);
  let setToRemove = $state<MusicSet | null>(null);

  // concert order (drag and drop)
  let draggingId = $state<string | undefined>();
  let flashId = $state<string | undefined>();
  let orderError = $state("");
  let reorderOpen = $state(false);
  let orderSaved = $state(false);
  let orderAtDragStart: MusicSet[] = [];
  let orderBeforeSave: MusicSet[] | undefined;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  let orderSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let orderSavedTimer: ReturnType<typeof setTimeout> | undefined;

  let attachedIds = $derived(new Set(sets.map((s) => s.id)));
  let canReorder = $derived(sets.length > 1);
  let reordering = $derived(reorderOpen && canReorder);

  onMount(async () => {
    const [info, projectSets] = await Promise.all([
      projectsApi.get(id),
      projectsApi.getSets(id),
    ]);
    const loaded = catalogData(info);
    if (loaded) project = loaded;
    else loadFailed = true;
    sets = catalogData(projectSets) ?? [];
    loading = false;
  });
  onDestroy(() => {
    clearTimeout(searchTimer);
    clearTimeout(flashTimer);
    clearTimeout(orderSavedTimer);
    // Leaving mid-debounce must not drop the order the admin just arranged.
    if (orderSaveTimer !== undefined) {
      clearTimeout(orderSaveTimer);
      saveOrder();
    }
  });

  // The reorder list is the phone-only affordance, and the button that closes it
  // goes with it — so growing past phone width has to close it too.
  $effect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const closeOnWide = () => {
      if (!phone.matches) reorderOpen = false;
    };
    phone.addEventListener("change", closeOnWide);
    return () => phone.removeEventListener("change", closeOnWide);
  });

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
    const updated = await projectsApi.addSets(id, selectedIds);
    if (updated) sets = updated;
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
    if (res.ok) sets = sets.filter((s) => s.id !== set.id);
  }

  // ---- concert order ----
  /** Ring the set that just moved, so the eye can follow it to its new place. */
  function flashMoved(setId: string | undefined) {
    clearTimeout(flashTimer);
    flashId = setId;
    flashTimer = setTimeout(() => (flashId = undefined), 900);
  }
  /**
   * Coalesce the saves: a held-down arrow key or a quick run of drags should end
   * in a single request carrying the final order, and roll back to where the run
   * started if it fails — the grid must never show an order the server rejected.
   */
  function queueSaveOrder(previous: MusicSet[], movedId: string | undefined) {
    orderBeforeSave ??= previous;
    flashMoved(movedId);
    clearTimeout(orderSaveTimer);
    orderSaveTimer = setTimeout(saveOrder, 350);
  }
  async function saveOrder() {
    const previous = orderBeforeSave ?? sets;
    orderBeforeSave = undefined;
    orderSaveTimer = undefined;
    orderError = "";
    const res = await projectsApi.updateSetOrder(
      id,
      sets.map((s) => s.id!),
    );
    if (res.ok) {
      // The flash only says a card moved; this confirms it reached the archive.
      orderSaved = true;
      clearTimeout(orderSavedTimer);
      orderSavedTimer = setTimeout(() => (orderSaved = false), 2600);
    } else {
      sets = previous;
      orderError = "Kunne ikke lagre rekkefølgen. Prøv igjen.";
    }
  }
  function applyOrder(next: MusicSet[], movedId: string | undefined) {
    const previous = sets;
    sets = next;
    queueSaveOrder(previous, movedId);
  }

  function onDragStart(event: DragEvent, set: MusicSet) {
    orderAtDragStart = sets;
    draggingId = set.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", set.id ?? "");
    }
  }
  // Reorder as the card travels so the grid previews the drop, and save once it
  // is let go — saving per hovered card would fire a request per neighbour.
  function onDragOver(
    event: DragEvent & { currentTarget: HTMLElement },
    hoverIndex: number,
  ) {
    if (!draggingId) return;
    event.preventDefault();
    const dragIndex = sets.findIndex((s) => s.id === draggingId);
    if (dragIndex === -1 || dragIndex === hoverIndex) return;
    // The grid wraps, so a card is passed either sideways or downwards: past
    // the midpoint on either axis means the drop lands after it.
    const rect = event.currentTarget.getBoundingClientRect();
    const dropAfter =
      event.clientY > rect.top + rect.height / 2 ||
      event.clientX > rect.left + rect.width / 2;
    // Once lifted out of the list, everything after it shifts down one.
    const hoverAfterLift = hoverIndex > dragIndex ? hoverIndex - 1 : hoverIndex;
    const to = dropAfter ? hoverAfterLift + 1 : hoverAfterLift;
    if (to !== dragIndex) sets = moveItem(sets, dragIndex, to);
  }
  function onDragEnd() {
    const movedId = draggingId;
    draggingId = undefined;
    if (isSameOrder(sets, orderAtDragStart)) return;
    queueSaveOrder(orderAtDragStart, movedId);
  }
  // Keyboard equivalent of the drag, announced in the card's label.
  function onCardKeydown(event: KeyboardEvent, index: number) {
    if (!event.altKey) return;
    const step =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (step === 0) return;
    // Claim the combination even at the ends of the row: Alt + arrow is the
    // browser's Back/Forward on Windows and Linux.
    event.preventDefault();
    const to = index + step;
    if (to < 0 || to >= sets.length) return;
    applyOrder(moveItem(sets, index, to), sets[index].id);
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
    editError = "";
    editOpen = true;
  }
  async function saveEdit() {
    if (!canSaveEdit) return;
    savingProject = true;
    editError = "";
    const body: UpdateProjectRequest = {
      name: draft.name,
      comments: draft.comments?.trim() || null,
      startDate: toApiDate(draft.startDate!),
      endDate: toApiDate(draft.endDate!),
    };
    const res = await projectsApi.update(id, body);
    savingProject = false;
    if (res) {
      // The update is documented to answer with the project, but keep the
      // description we just saved rather than depend on it being echoed back.
      project = { ...res, comments: body.comments };
      editOpen = false;
    } else {
      editError = "Kunne ikke lagre prosjektet. Prøv igjen.";
    }
  }

  // ---- delete project ----
  async function removeProject() {
    const res = await projectsApi.remove(id);
    if (res.ok) goto("/projects");
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
{:else if loadFailed}
  <EmptyState
    title="Fant ikke prosjektet"
    description="Prosjektet finnes ikke lenger, eller kunne ikke lastes. Gå tilbake til prosjektlisten og prøv igjen."
  >
    {#snippet icon()}<FolderX size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
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
    <div class="secbar__actions">
      {#if canReorder}
        <p class="orderhint">
          <GripVertical size={13} /> Dra for å endre konsertrekkefølge
        </p>
        <button
          class="reorderbtn"
          class:active={reordering}
          aria-pressed={reordering}
          aria-label={reordering
            ? "Ferdig med rekkefølgen"
            : "Endre rekkefølge"}
          onclick={() => (reorderOpen = !reorderOpen)}
        >
          {#if reordering}<Check size={18} />{:else}<ArrowUpDown
              size={18}
            />{/if}
        </button>
      {/if}
      <button class="addbtn" onclick={openAdd}>
        <Plus size={16} /> Legg til notesett
      </button>
    </div>
  </div>

  {#if orderError}
    <p class="error-message">{orderError}</p>
  {/if}

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
  {:else if reordering}
    <SetOrderList {sets} movedId={flashId} onreorder={applyOrder} />
  {:else}
    <div class="grid">
      {#each sets as set, index (set.id)}
        <div
          class="grid__item"
          draggable={canReorder}
          ondragstart={(event) => onDragStart(event, set)}
          ondragover={(event) => onDragOver(event, index)}
          ondragend={onDragEnd}
          ondrop={(event) => event.preventDefault()}
          onkeydown={(event) => onCardKeydown(event, index)}
          class:moved={flashId === set.id}
          animate:flip={draggingId === set.id ? { duration: 0 } : reorderFlip()}
        >
          <SetCard
            title={set.title}
            composer={set.composer}
            arranger={set.arranger}
            href={`/set/edit/${set.id}`}
            ordinal={index + 1}
            reorderable={canReorder}
            dragging={draggingId === set.id}
            removable
            onremove={() => askRemoveSet(set)}
          />
        </div>
      {/each}
      <button class="addtile" onclick={openAdd}>
        <span class="ic"><Plus size={26} /></span>
        <span class="t">Legg til notesett</span>
      </button>
    </div>
  {/if}

  <!-- Mobile: sticky primary action (see Project Edit - Mobile design). -->
  <div class="fab">
    {#if reordering}
      <button class="fab__btn" onclick={() => (reorderOpen = false)}>
        <Check size={18} /> Ferdig
      </button>
    {:else}
      <button class="fab__btn" onclick={openAdd}>
        <Plus size={18} /> Legg til notesett
      </button>
    {/if}
  </div>
{/if}

<!-- Add-sets dialog -->
<Modal title="Legg til notesett" bind:open={addOpen} size="lg">
  <!-- The search field stays mounted while results load: the dialog hands it
       the focus on open (`data-autofocus`), and swapping it out mid-search
       would take the caret away from whoever is still typing. -->
  <div class="setsearch">
    <span class="ico"><Search size={16} /></span>
    <input
      class="in has-ico"
      data-autofocus
      placeholder="Søk i arkivet etter tittel, komponist eller arrangør…"
      bind:value={searchTerm}
      oninput={onCatalogSearchInput}
    />
  </div>
  {#if loadingCatalog}
    <LoadingSpinner inline />
  {:else}
    <div class="listhead">
      <span></span><span>Nr.</span><span>Tittel</span><span>Komponist</span
      ><span>Arrangør</span>
    </div>
    <div class="setlist">
      {#each catalogItems as c (c.id)}
        {@const already = attachedIds.has(c.id)}
        {@const hasArchiveNumber = c.archiveNumber !== undefined}
        <button
          class="setrow"
          class:sel={selectedIds.includes(c.id ?? "")}
          class:added={already}
          disabled={already}
          onclick={() => toggleSelect(c.id ?? "")}
        >
          <span class="chk"><Check size={13} /></span>
          <!-- The separator that joins number and title on a phone belongs to
               the number, so a set without one doesn't lead with a stray dash. -->
          <span class="nr" class:unnumbered={!hasArchiveNumber}
            >{hasArchiveNumber ? c.archiveNumber : "—"}</span
          >
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
  {#if editError}
    <p class="error-message modal-error">{editError}</p>
  {/if}
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

{#if orderSaved}
  <div class="toast-wrap">
    <div class="toast" role="status" transition:fly={toastEnter()}>
      <span class="ti"><CircleCheck size={17} /></span>
      Konsertrekkefølgen er lagret
    </div>
  </div>
{/if}

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
  .secbar__actions {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .orderhint {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
  }
  /* Phones can't drag the cards, so they get a reorder mode instead — the
     toggle and the hint swap places in the media query below. */
  .reorderbtn {
    display: none;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      color var(--dur-fast);
  }
  .reorderbtn.active {
    color: var(--accent);
    border-color: var(--accent);
  }
  .error-message {
    margin: 0 0 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }
  /* In a dialog the message follows the form rather than heading a section. */
  .modal-error {
    margin: 16px 0 0;
  }

  /* ---- save confirmation ---- */
  /* A toast rather than a line in the flow: the order is saved from a drop with
     the pointer over the grid, and an element appearing above it would shove the
     cards out from under the cursor. The wrapper does the centring so the fly
     transition's own transform has the toast to itself. */
  .toast-wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 28px;
    z-index: 60;
    display: flex;
    justify-content: center;
    padding: 0 18px;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    background: var(--ink-700);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    font-family: var(--font-text);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
  .toast .ti {
    display: inline-flex;
    color: var(--success);
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
  /* A 1fr track's auto floor is the card's min-content width, which stops one
     column shrinking and skews the row; min-width: 0 keeps them in step. */
  .grid__item {
    min-width: 0;
  }
  /* Rings the card that just moved as it lands, then fades back. */
  .grid__item.moved {
    animation: move-flash var(--dur-slow) var(--ease-out);
  }
  @keyframes move-flash {
    from {
      box-shadow: 0 0 0 3px var(--accent);
    }
    to {
      box-shadow: none;
    }
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
    grid-template-columns: 24px 60px 1.4fr 1fr 1fr;
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
    grid-template-columns: 24px 60px 1.4fr 1fr 1fr;
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
  .setrow .nr {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
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

  /* Tablets: the drag hint and the add button together are too wide to share the
     heading's line, so stack them — title, count subtitle, then the actions.
     Phones drop both for the compact toggle and go back to one row (below). */
  @media (min-width: 641px) and (max-width: 720px) {
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
  }

  @media (max-width: 720px) {
    .title {
      font-size: 30px;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 22px 16px;
    }
    /* Drop the table columns: stack composer under the title as a list row. */
    .listhead {
      display: none;
    }
    /* The number rides on the title's line and the composer runs under both, so
       it costs a line's slack instead of a column (as in the archive list). */
    .setrow {
      grid-template-columns: 22px auto 1fr auto;
      grid-template-areas:
        "chk nr  ttl  pill"
        "chk cmp cmp  pill";
      column-gap: 12px;
      row-gap: 2px;
      align-items: center;
      padding: 13px 8px;
    }
    .setrow .chk {
      grid-area: chk;
      align-self: center;
    }
    /* The dash reads as punctuation between the two, so claw back most of the
       row's column gap — it is meant for the checkbox, not for a separator. */
    .setrow .nr {
      grid-area: nr;
      color: var(--text-muted);
      margin-right: -5px;
    }
    .setrow .nr::after {
      content: " -";
    }
    .setrow .nr.unnumbered::after {
      content: none;
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
    .orderhint {
      display: none;
    }
    .reorderbtn {
      display: inline-flex;
    }
    /* Only the compact toggle is left in the actions row here, so the heading
       keeps it company on one line — count inline, toggle at the right edge
       (see Project Edit - Mobile). Centred, since the icon button has no text
       baseline to share with the heading. */
    .secbar {
      align-items: center;
    }
    .secbar h2 {
      font-size: 19px;
    }
    /* Clear the sticky action bar that appears at this width. */
    .toast-wrap {
      bottom: calc(88px + env(safe-area-inset-bottom));
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
