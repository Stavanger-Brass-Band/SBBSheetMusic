<script lang="ts">
  import { Dialog } from "flowbite-svelte";
  import { goto } from "$app/navigation";
  import {
    ArrowRight,
    Folder,
    Music,
    Search,
    UsersRound,
  } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { musicians as musiciansApi } from "$lib/api/musicians";
  import { projects as projectsApi } from "$lib/api/projects";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import type { Navigation } from "$lib/navigation";
  import type { Musician } from "$lib/types";
  import { canOpenSetRoute } from "$lib/utils/setRoute";
  import {
    QUICK_JUMP_GROUP_LIMIT,
    flattenGroups,
    memberResults,
    pageResults,
    projectResults,
    quickJumpGroups,
    setResults,
    stepIndex,
    type QuickJumpResult,
  } from "$lib/utils/quickJump";
  import { Spinner } from "$lib/components/ui";
  import PageLoader from "$lib/components/PageLoader.svelte";

  /**
   * Quick jump: one field that reaches any set, project, member or page the
   * reader's roles allow, opened with ⌘K / Ctrl+K or from the header's button.
   *
   * Hand-built on Flowbite's `Dialog` rather than its `CommandPalette`, which
   * filters a list it is given on the client. This one has to search the API —
   * the archive is near 2000 sets and the server owns `$search` — and needs
   * grouped results, a loading state and Norwegian chrome, none of which that
   * component offers. `Dialog` still gives the native modal, the backdrop, Escape
   * and the focus handling, so only the palette itself is bespoke.
   *
   * Keyboard focus stays in the field throughout: the rows are buttons kept out
   * of the tab order, addressed for assistive technology through
   * `aria-activedescendant`, which is the combobox pattern a palette wants.
   */
  let {
    open = $bindable(false),
    navigation,
  }: {
    open?: boolean;
    navigation: Navigation;
  } = $props();

  /**
   * How long typing has to pause before the API is asked. Longer than the
   * archive's 300ms rather than shorter, which is where this started: the archive
   * keeps its rows on screen while a query is in flight, but here the whole list
   * is rebuilt around whatever came back, so firing mid-word reshuffles the rows
   * under a reader who is still typing — and the row under the selection with
   * them.
   */
  const SEARCH_DEBOUNCE_MS = 400;

  let query = $state("");
  let searching = $state(false);
  // The sets or projects search failed. Said plainly rather than shown as an
  // empty result: "no matches" and "the search didn't run" are different answers.
  let searchFailed = $state(false);
  let setRows = $state<QuickJumpResult[]>([]);
  let projectRows = $state<QuickJumpResult[]>([]);
  /**
   * Which searches came back with a full page, so the reader can be told there
   * are matches they aren't seeing. Read off the raw responses rather than the
   * rows, since a row can be dropped for having no route.
   */
  let cappedKinds = $state<QuickJumpResult["kind"][]>([]);
  let musicians = $state<Musician[]>([]);
  let selectedIndex = $state(0);
  let listElement = $state<HTMLUListElement>();

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  /**
   * Guards against a slow request landing after a faster later one. Not `$state`
   * — nothing renders it, and a keystroke's own bookkeeping shouldn't invalidate
   * the results it is about to replace.
   */
  let latestRequest = 0;
  /** Whether the roster has been fetched for this session. */
  let rosterLoaded = false;

  let allPages = $derived([...navigation.primary, ...navigation.admin]);

  let groups = $derived(
    quickJumpGroups({
      sets: setRows,
      projects: projectRows,
      members: memberResults(musicians, query),
      pages: pageResults(allPages, query),
      capped: cappedKinds,
    }),
  );
  let results = $derived(flattenGroups(groups));

  /**
   * The selected row's place in the list, clamped rather than trusted: the member
   * and page groups re-filter on every keystroke, so the list can shrink under a
   * selection that was valid a character ago.
   */
  let activeIndex = $derived(
    results.length ? Math.min(selectedIndex, results.length - 1) : 0,
  );
  let selected = $derived<QuickJumpResult | undefined>(results[activeIndex]);

  let trimmedQuery = $derived(query.trim());

  // Every opening starts clean — a palette that came back holding the last
  // search would have the reader deleting someone else's query first.
  $effect(() => {
    if (!open) return;
    query = "";
    setRows = [];
    projectRows = [];
    cappedKinds = [];
    searchFailed = false;
    selectedIndex = 0;
    void loadRoster();
  });

  // Keeps the selected row on screen as the arrows walk past the visible edge.
  $effect(() => {
    const id = selected?.id;
    if (!id || !listElement) return;
    listElement
      .querySelector(`#${CSS.escape(id)}`)
      ?.scrollIntoView({ block: "nearest" });
  });

  /**
   * The whole band, fetched once and filtered on the client — `GET /musicians`
   * takes no search options and answers with one small list. A failed read only
   * means the palette offers no people, which is not worth a message of its own;
   * it is left unmarked so the next opening tries again.
   */
  async function loadRoster() {
    if (rosterLoaded) return;
    const loaded = await musiciansApi.list().catch(() => undefined);
    if (!loaded) return;
    musicians = loaded;
    rosterLoaded = true;
  }

  function onInput() {
    // The selection belongs to the results on screen, so it resets the moment
    // they are known to be stale — not when the answer arrives.
    selectedIndex = 0;
    clearTimeout(searchTimer);
    if (!query.trim()) {
      // Nothing to search for, so nothing to wait for either: clear at once
      // rather than leaving the last query's rows under an empty field.
      latestRequest += 1;
      setRows = [];
      projectRows = [];
      cappedKinds = [];
      searching = false;
      searchFailed = false;
      return;
    }
    searching = true;
    searchTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  }

  async function runSearch() {
    const search = query.trim();
    if (!search) return;

    const request = ++latestRequest;
    searchFailed = false;

    // Both searches need catalog access of any kind, and the API narrows each to
    // what the roles reach. A reader who can't open a set from its own id — a
    // Musikant — gets the projects expanded alongside it, because a project is
    // the only route they have into a set (see `canOpenSetRoute`).
    const wantsSets = auth.canAccessCatalog;
    const wantsProjects = auth.canAccessCatalog;
    const needsProjectContext = !canOpenSetRoute(auth);

    const [sets, projects] = await Promise.all([
      wantsSets
        ? sheetMusic
            .searchSets({
              search,
              // Not the helper's default of newest archive number first: paired
              // with a cap that means "the highest-numbered matches", so a query
              // with more hits than fit silently loses the older sets — which is
              // exactly how a set that does exist comes to look as if it
              // doesn't. Alphabetical is at least the order a reader scanning
              // for a title expects.
              orderBy: "title asc",
              top: QUICK_JUMP_GROUP_LIMIT,
              expandProjects: needsProjectContext,
            })
            .catch(() => undefined)
        : Promise.resolve([]),
      wantsProjects
        ? projectsApi
            .search({ search, top: QUICK_JUMP_GROUP_LIMIT })
            .catch(() => undefined)
        : Promise.resolve([]),
    ]);

    // A later keystroke has already been answered — this one's results are the
    // older truth and would overwrite the newer one.
    if (request !== latestRequest) return;

    searchFailed = sets === undefined || projects === undefined;
    setRows = setResults(sets ?? [], auth);
    projectRows = projectResults(projects ?? []);
    // A full page means the API had at least this many — there is no total-count
    // envelope to ask, so a full page is the only signal there is.
    cappedKinds = [
      ...((sets?.length ?? 0) >= QUICK_JUMP_GROUP_LIMIT
        ? (["set"] as const)
        : []),
      ...((projects?.length ?? 0) >= QUICK_JUMP_GROUP_LIMIT
        ? (["project"] as const)
        : []),
    ];
    searching = false;
  }

  function openResult(result: QuickJumpResult | undefined) {
    if (!result) return;
    open = false;
    void goto(result.href);
  }

  /**
   * The shortcut, listened for while the app is running. Both modifiers count:
   * the same build serves Mac keyboards and Windows ones, and only the hint on
   * the trigger has to pick between them.
   */
  function onWindowKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
      return;
    event.preventDefault();
    open = !open;
  }

  /** Arrow keys and Enter, from wherever inside the palette they were pressed. */
  function onPaletteKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = stepIndex(activeIndex, 1, results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = stepIndex(activeIndex, -1, results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openResult(selected);
    }
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet rowIcon(kind: QuickJumpResult["kind"])}
  {#if kind === "set"}
    <Music size={16} strokeWidth={1.8} />
  {:else if kind === "project"}
    <Folder size={16} strokeWidth={1.8} />
  {:else if kind === "member"}
    <UsersRound size={16} strokeWidth={1.8} />
  {:else}
    <ArrowRight size={16} strokeWidth={1.8} />
  {/if}
{/snippet}

<Dialog
  bind:open
  dismissable={false}
  aria-label="Hurtigsøk"
  class="mx-auto mt-[10vh] w-full max-w-[620px] border-0 bg-transparent p-0 dark:bg-transparent"
>
  <div class="palette">
    <div class="field">
      <span class="field__icon">
        {#if searching}
          <Spinner size={18} inline />
        {:else}
          <Search size={18} />
        {/if}
      </span>
      <!-- The arrows and Enter are caught on the field itself, which is where
           focus stays: the rows are kept out of the tab order, so nothing else
           can hold it while the palette is open. -->
      <input
        class="field__input"
        type="text"
        placeholder="Søk etter notesett, prosjekt eller medlem…"
        bind:value={query}
        oninput={onInput}
        onkeydown={onPaletteKeydown}
        role="combobox"
        aria-expanded="true"
        aria-controls="quick-jump-results"
        aria-activedescendant={selected?.id}
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    {#if searchFailed}
      <p class="notice">Søket feilet. Prøv igjen.</p>
    {/if}

    {#if results.length}
      <ul
        bind:this={listElement}
        class="results"
        id="quick-jump-results"
        role="listbox"
        aria-label="Treff"
      >
        {#each groups as group (group.kind)}
          <li class="heading" role="presentation">{group.heading}</li>
          {#each group.results as result (result.id)}
            <li role="presentation">
              <button
                type="button"
                id={result.id}
                role="option"
                aria-selected={result.id === selected?.id}
                class="row"
                class:selected={result.id === selected?.id}
                tabindex="-1"
                onclick={() => openResult(result)}
                onmouseenter={() => (selectedIndex = results.indexOf(result))}
              >
                <span class="row__icon">{@render rowIcon(result.kind)}</span>
                <span class="row__text">
                  <span class="row__label">{result.label}</span>
                  {#if result.detail}
                    <span class="row__detail">{result.detail}</span>
                  {/if}
                </span>
                {#if result.meta}
                  <span class="row__meta sbb-mono">{result.meta}</span>
                {/if}
              </button>
            </li>
          {/each}
          {#if group.capped}
            <!-- Said rather than left to be inferred: a reader who doesn't see a
                 set they know exists concludes the archive has lost it. -->
            <li class="more" role="presentation">
              Flere treff — skriv mer for å snevre inn.
            </li>
          {/if}
        {/each}
      </ul>
    {:else if searching}
      <!-- Only the first search reaches this: a later keystroke keeps the
           previous rows on screen, so this is the one moment the body has
           nothing in it at all. The ring in the field says a request is out;
           this says what it is looking for. -->
      <PageLoader inline label="Søker…" />
    {:else if trimmedQuery}
      <p class="empty">Ingen treff på «{trimmedQuery}».</p>
    {/if}

    <div class="foot">
      <span><kbd>↑</kbd><kbd>↓</kbd> Naviger</span>
      <span><kbd>↵</kbd> Åpne</span>
      <span><kbd>Esc</kbd> Lukk</span>
    </div>
  </div>
</Dialog>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    outline: none;
  }

  /* Flush to the panel's top edge — a bordered field inside a bordered panel
     reads as two boxes. The hairline under it is what separates the two. */
  .field {
    position: relative;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }
  .field__icon {
    position: absolute;
    left: 18px;
    display: flex;
    color: var(--text-muted);
    pointer-events: none;
  }
  .field__input {
    width: 100%;
    height: 56px;
    padding: 0 18px 0 48px;
    font-family: var(--font-text);
    font-size: 16px;
    color: var(--text-primary);
    background: transparent;
    border: 0;
    outline: none;
  }
  .field__input::placeholder {
    color: var(--text-muted);
  }

  .notice {
    margin: 0;
    padding: 12px 18px;
    font-size: 13px;
    color: var(--danger);
    border-bottom: 1px solid var(--border-subtle);
  }

  .results {
    margin: 0;
    padding: 6px;
    list-style: none;
    max-height: min(52vh, 420px);
    overflow-y: auto;
  }

  .heading {
    padding: 12px 12px 6px;
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-muted);
  }

  .more {
    padding: 6px 12px 10px 44px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 12px;
    font-family: var(--font-text);
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  /* One selected style for both the keyboard and the pointer: hovering moves the
     selection, so there is only ever one row to mark. */
  .row.selected {
    background: var(--surface-hover);
  }
  .row__icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--text-muted);
  }
  .row.selected .row__icon {
    color: var(--brass-500);
  }
  .row__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .row__label,
  .row__detail {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .row__label {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .row__detail {
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .row__meta {
    flex-shrink: 0;
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .empty {
    margin: 0;
    padding: 40px 18px;
    text-align: center;
    font-size: 14px;
    color: var(--text-muted);
  }

  .foot {
    display: flex;
    gap: 20px;
    padding: 10px 18px;
    background: var(--surface-sunken);
    border-top: 1px solid var(--border-subtle);
    font-size: 11.5px;
    color: var(--text-muted);
  }
  .foot span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
    background: var(--surface-hover);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
  }

  @media (max-width: 640px) {
    .field__input {
      height: 52px;
      font-size: 15px;
    }
    /* Three hints don't fit a phone's width, and the two that name keys a phone
       hasn't got are the ones to drop. */
    .foot {
      display: none;
    }
  }
</style>
