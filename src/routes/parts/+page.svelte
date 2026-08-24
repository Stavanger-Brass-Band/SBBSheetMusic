<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Modal } from "flowbite-svelte";
  import { Plus, SearchX, ListMusic, Check, Tag } from "@lucide/svelte";
  import { parts as partsApi } from "$lib/api/parts";
  import { users as usersApi } from "$lib/api/users";
  import { byCatalogOrder } from "$lib/utils/partOrder";
  import { auth } from "$lib/stores/auth.svelte";
  import { replaceListUrl } from "$lib/utils/listNavigation";
  import { musiciansByPartId } from "$lib/utils/partMusicians";
  import {
    NO_GROUP_FILTER,
    partsListQueryParams,
    readPartsListQuery,
  } from "$lib/utils/partsListQuery";
  import {
    INSTRUMENT_GROUPS,
    type Part,
    type PartForm,
    type PartRequest,
    type User,
  } from "$lib/types";
  import {
    AvatarStack,
    Badge,
    Button,
    EmptyState,
    FilterChip,
    SearchInput,
  } from "$lib/components/ui";
  import PartModalBody from "$lib/components/PartModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  /**
   * How many aliases a row shows before the rest become a count. Two rather than
   * three because a third wraps the cell onto a second line at this width, which
   * costs every row height for an alias nobody reads in passing — they are matched
   * against filenames, not looked up here. The full list is on the part's page.
   */
  const MAX_CHIPS = 2;

  let allParts = $state<Part[]>([]);
  let loading = $state(true);

  /**
   * Who plays each stemme, keyed by part id. Built from the user list, which only
   * an Admin may read (`GET /users` is admin-only), so the column is left out
   * entirely for a Noteansvarlig rather than shown empty — an empty seat and a
   * seat we aren't allowed to see read the same otherwise, and only one of them
   * means nobody plays the stemme.
   */
  let musiciansByPart = $state<ReadonlyMap<string, User[]>>(new Map());
  let musiciansLoaded = $state(false);
  let showMusicians = $derived(auth.isAdmin && musiciansLoaded);

  // Search and the group filter are client-side — the endpoint returns every
  // part in one call — but both live in the URL all the same, so opening a part
  // and coming back lands on the same filtered list (see `partsListQuery`).
  let searchTerm = $state("");
  let selectedGroup = $state("");

  let filtered = $derived.by(() => {
    // The catalogue's own ordering, tie-broken by name — a whole section shares
    // one rank (five stemmer at 4, in the cornets alone), and without the
    // tie-break those rows land wherever the server happened to return them.
    const sorted = [...allParts].sort(byCatalogOrder);
    const query = searchTerm.trim().toLowerCase();
    return sorted.filter((part) => {
      if (selectedGroup === NO_GROUP_FILTER) {
        if (part.instrumentGroup) return false;
      } else if (selectedGroup && part.instrumentGroup !== selectedGroup) {
        return false;
      }
      if (!query) return true;
      return (
        (part.name ?? "").toLowerCase().includes(query) ||
        (part.aliases ?? []).some((alias) =>
          alias.toLowerCase().includes(query),
        )
      );
    });
  });
  let isFiltered = $derived(!!searchTerm.trim() || !!selectedGroup);
  /**
   * Why the list is empty, naming whichever filters are on — a reader who has
   * both a search and a group narrowed needs to know both are in play before
   * concluding the stemme isn't in the catalogue.
   */
  let emptyResultDescription = $derived.by(() => {
    const query = searchTerm.trim();
    const groupLabel =
      selectedGroup === NO_GROUP_FILTER ? "uten gruppe" : selectedGroup;
    if (query && selectedGroup)
      return `Fant ingen stemmer som passer «${query}» blant stemmene ${selectedGroup === NO_GROUP_FILTER ? groupLabel : `i ${groupLabel}`}. Prøv et annet søk, en annen gruppe, eller sjekk om navnet finnes som et alias.`;
    if (query)
      return `Fant ingen stemmer som passer «${query}». Prøv et annet søk, eller sjekk om navnet finnes som et alias.`;
    return selectedGroup === NO_GROUP_FILTER
      ? "Alle stemmer i katalogen har en gruppe."
      : `Ingen stemmer er lagt i gruppen ${groupLabel}.`;
  });

  /**
   * The current view as a query string, handed to the editor so its way back
   * returns here rather than to the unfiltered catalogue.
   */
  let listQuery = $derived(
    partsListQueryParams(searchTerm, selectedGroup).join("&"),
  );

  function openPart(partId: string) {
    const query = listQuery;
    goto(
      `/part/edit/${partId}${query ? `?from=${encodeURIComponent(query)}` : ""}`,
    );
  }

  /** Mirror the view into the URL, replacing the entry rather than stacking one. */
  function syncUrl() {
    replaceListUrl(partsListQueryParams(searchTerm, selectedGroup), "/parts");
  }

  function selectGroup(group: string) {
    selectedGroup = selectedGroup === group ? "" : group;
    syncUrl();
  }
  let indexableCount = $derived(
    allParts.filter((part) => part.indexable).length,
  );

  // Create-only modal. Editing (details, aliases, delete) lives on the
  // dedicated /part/edit/[id] page, reached by clicking a row.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let form = $state<PartForm>({
    name: "",
    sortOrder: 0,
    indexable: true,
    alwaysDisplay: false,
    instrumentGroup: "",
  });
  let errorMessage = $state("");

  let canSave = $derived(!!form.name.trim());

  onMount(async () => {
    // The URL is read before the fetch, so the list paints already filtered
    // rather than showing the whole catalogue for a frame first.
    const restored = readPartsListQuery(
      page.url.searchParams,
      INSTRUMENT_GROUPS,
    );
    searchTerm = restored.searchTerm;
    selectedGroup = restored.selectedGroup;
    void loadMusicians();
    allParts = (await partsApi.list()) ?? [];
    loading = false;
  });

  /**
   * The musicians behind the Musikanter column. Fetched on its own and never
   * awaited alongside the catalogue: it is one column of one page, so a failure
   * — or a reader without the role for it — costs that column and nothing else.
   */
  async function loadMusicians() {
    if (!auth.isAdmin) return;
    const users = await usersApi.list().catch(() => null);
    if (!users) return;
    musiciansByPart = musiciansByPartId(users);
    musiciansLoaded = true;
  }

  function musiciansFor(part: Part): User[] {
    return (part.id && musiciansByPart.get(part.id)) || [];
  }

  // New parts get the next free slot, leaving gaps to reorder between.
  function nextOrder(): number {
    return allParts.length
      ? Math.max(...allParts.map((part) => part.sortOrder ?? 0)) + 10
      : 10;
  }

  function openCreate() {
    form = {
      name: "",
      sortOrder: nextOrder(),
      indexable: true,
      alwaysDisplay: false,
      instrumentGroup: "",
    };
    errorMessage = "";
    isOpen = true;
  }

  // Aliases can only be attached once the part exists, so hand off to the edit
  // page on success — that's where they're managed.
  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";
    const body: PartRequest = {
      name: form.name.trim(),
      sortOrder: form.sortOrder,
      indexable: form.indexable,
      alwaysDisplay: form.alwaysDisplay,
      instrumentGroup: form.instrumentGroup || null,
    };
    try {
      const created = await partsApi.create(body);
      if (!created?.id) throw new Error("create failed");
      isOpen = false;
      goto(`/part/edit/${created.id}`);
    } catch {
      errorMessage = "Kunne ikke lagre stemmen. Prøv igjen.";
    } finally {
      isSaving = false;
    }
  }
</script>

{#snippet aliasChips(aliases: string[])}
  {#if aliases.length === 0}
    <span class="chip none">Ingen aliaser</span>
  {:else}
    <div class="chips">
      {#each aliases.slice(0, MAX_CHIPS) as alias}
        <span class="chip">{alias}</span>
      {/each}
      {#if aliases.length > MAX_CHIPS}
        <span class="chip more">+{aliases.length - MAX_CHIPS}</span>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet musicians(part: Part)}
  {@const playing = musiciansFor(part)}
  {#if playing.length === 0}
    <span class="chip none">Ingen</span>
  {:else}
    <AvatarStack users={playing} />
  {/if}
{/snippet}

{#snippet groupBadge(part: Part)}
  {#if part.instrumentGroup}
    <Badge variant="outline">{part.instrumentGroup}</Badge>
  {:else}
    <span class="chip none">Ingen gruppe</span>
  {/if}
{/snippet}

<!--
  "Synlig" / "Skjult" rather than "Indekseres" / "Skjult": the pair was already
  half-committed to the visible/hidden reading by the negative label, and
  completing it makes the two symmetrical and fits the pill in half the width. It
  means visible *to the indexing*, which the header names — the part's own form
  spells the whole of it out ("Brukes i register / auto-matching").
-->
{#snippet indexBadge(part: Part)}
  {#if part.indexable}
    <Badge variant="success" dot>Synlig</Badge>
  {:else}
    <Badge variant="neutral" dot>Skjult</Badge>
  {/if}
{/snippet}

<div class="sbb-list-head">
  <div class="title-cell">
    <h1 class="sbb-h1">Stemmekatalog</h1>
    <p class="lede">
      Definerer alle stemmer i korpset. Aliaser brukes til å automatisk
      gjenkjenne opplastede filnavn ved masseopplasting.
    </p>
  </div>
  <Button class="create-btn" onclick={openCreate}>
    <Plus size={17} /> Legg til stemme
  </Button>
</div>

<SearchInput
  placeholder="Søk i stemmer og aliaser…"
  bind:value={searchTerm}
  oninput={syncUrl}
/>

<div class="sbb-filter-row">
  <span class="sbb-filter-label"><Tag size={14} /> Gruppe</span>
  <FilterChip active={!selectedGroup} onclick={() => selectGroup("")}>
    Alle
  </FilterChip>
  {#each INSTRUMENT_GROUPS as group}
    <FilterChip
      active={selectedGroup === group}
      onclick={() => selectGroup(group)}
    >
      {group}
    </FilterChip>
  {/each}
  <FilterChip
    active={selectedGroup === NO_GROUP_FILTER}
    onclick={() => selectGroup(NO_GROUP_FILTER)}
  >
    Uten gruppe
  </FilterChip>
</div>

{#if loading}
  <LoadingSpinner label="Laster stemmekatalog…" />
{:else if filtered.length === 0}
  {#if isFiltered}
    <EmptyState title="Ingen treff" description={emptyResultDescription}>
      {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Ingen stemmer ennå"
      description="Stemmekatalogen er tom. Legg til den første stemmen for å begynne å bygge oppsettet som driver automatisk gjenkjenning."
    >
      {#snippet icon()}<ListMusic size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <th class="c-order">Nr.</th>
          <th>Navn</th>
          <th>Aliaser</th>
          {#if showMusicians}
            <th class="c-musicians">Musikanter</th>
          {/if}
          <th class="c-group">Gruppe</th>
          <!-- "Indeks" rather than "Indeksering": the pills below say what
               happens, so the header only has to name what it is about. -->
          <th class="c-index">Indeks</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as part (part.id)}
          <tr class="clickable" onclick={() => openPart(part.id!)}>
            <td class="c-order">{part.sortOrder}</td>
            <td class="c-name">{part.name}</td>
            <td class="c-aliases">{@render aliasChips(part.aliases ?? [])}</td>
            {#if showMusicians}
              <td class="c-musicians">{@render musicians(part)}</td>
            {/if}
            <td class="c-group">{@render groupBadge(part)}</td>
            <td class="c-index">{@render indexBadge(part)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filtered as part (part.id)}
      <div class="sbb-card clickable" onclick={() => openPart(part.id!)}>
        <div class="body">
          <div class="t">
            <span class="card-order">{part.sortOrder}</span> - {part.name}
          </div>
          {#if part.instrumentGroup}
            <div class="card-group">{part.instrumentGroup}</div>
          {/if}
          <div class="card-chips">{@render aliasChips(part.aliases ?? [])}</div>
          {#if showMusicians && musiciansFor(part).length > 0}
            <div class="card-musicians">
              <span class="card-musicians__label">Musikanter</span>
              <AvatarStack users={musiciansFor(part)} size={26} />
            </div>
          {/if}
        </div>
        <!-- Indexing reads as metadata on the card, so it sits in the top-right
             corner rather than below the aliases. -->
        <div class="acts card-badge">{@render indexBadge(part)}</div>
      </div>
    {/each}
  </div>

  <p class="foot-note">
    Viser <b>{filtered.length}</b> stemmer · <b>{indexableCount}</b> brukes i automatisk
    gjenkjenning.
  </p>
{/if}

<Modal title="Ny stemme" bind:open={isOpen} size="md">
  <PartModalBody {form} />
  <p class="modal-note">Aliaser legges til etter at stemmen er opprettet.</p>
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
    <Button loading={isSaving} disabled={!canSave} onclick={save}>
      <Check size={16} /> Lagre
    </Button>
  {/snippet}
</Modal>

<style>
  .lede {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  /* Width belongs to the column, so it stays on both cells — but the mono
     treatment is for the number itself. Left on the shared class it also hit the
     header, where Svelte's scoping outranks the global `.sbb-table thead th` and
     so replaced its font and size while keeping the uppercasing and tracking. */
  /* Sized for the number rather than for the word "Rekkefølge", which was three
     times as wide as anything under it. The part's own page spells it out. */
  .c-order {
    width: 64px;
  }
  td.c-order {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
  }
  .c-name {
    font-weight: 600;
    font-size: 15px;
    white-space: nowrap;
  }
  .c-aliases {
    width: 28%;
  }
  /* Four faces at 28px with a 30% overlap, plus the count chip and its ring. */
  .c-musicians {
    width: 130px;
  }
  /* The stack's separator ring is painted in the row's own colour, so it has to
     follow the row when hover changes it. */
  tr:hover .c-musicians {
    --avatar-stack-ring: var(--surface-hover);
  }
  .c-group {
    width: 180px;
  }
  /* Both pills are now six characters, so the column is down to what one of them
     plus the cell's own padding needs. */
  .c-index {
    width: 120px;
  }
  /* Alias chips (shared between table cells and mobile cards). */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    white-space: nowrap;
  }
  .chip.more {
    font-family: var(--font-text);
    font-weight: 600;
    color: var(--text-muted);
  }
  .chip.none {
    padding-left: 0;
    font-style: italic;
    color: var(--text-muted);
    background: transparent;
    border-color: transparent;
  }

  .card-group {
    margin-top: 3px;
    font-size: 12.5px;
    color: var(--text-secondary);
  }
  .card-chips {
    margin-top: 10px;
  }
  .card-musicians {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }
  .card-musicians__label {
    font-size: 12.5px;
    color: var(--text-muted);
  }
  /* Mobile card: the sort order rides along in the name line, keeping the mono
     treatment it has in the table's own column. */
  .card-order {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
  }
  /* The shared card centres its trailing slot; pull the badge up to the first
     line so it aligns with the name it describes. */
  .card-badge {
    align-self: flex-start;
  }

  .foot-note {
    margin-top: 14px;
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .foot-note b {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }

  .modal-note {
    margin-top: 16px;
    font-size: 12.5px;
    font-style: italic;
    color: var(--text-muted);
  }
</style>
