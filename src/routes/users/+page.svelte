<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Modal, Select } from "flowbite-svelte";
  import { Plus, SearchX, Check, UsersRound } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import { parts as partsApi } from "$lib/api/parts";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import { ROLES } from "$lib/roles";
  import { formatDateTime } from "$lib/utils/date";
  import { replaceListUrl } from "$lib/utils/listNavigation";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import { toggleSort, type SortState } from "$lib/utils/listQuery";
  import {
    DEFAULT_USER_SORT,
    NO_PARTS_FILTER,
    NO_ROLE_FILTER,
    applyUsersListView,
    readUsersListQuery,
    userInstrumentGroups,
    toUserStatusFilter,
    usersListQueryParams,
    type UserStatusFilter,
    type UsersListView,
  } from "$lib/utils/usersListQuery";
  import {
    INSTRUMENT_GROUPS,
    type Part,
    type User,
    type UserForm,
  } from "$lib/types";
  import {
    Badge,
    Button,
    EmptyState,
    SearchInput,
    SortableTableHeader,
    UserAvatar,
    LoadFailed,
  } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  // The three filters as dropdown options. Each one's first entry is the "no
  // filter" choice rather than a separate reset: not narrowing is one of the
  // choices, and it keeps every filter to a single control.
  const roleItems = [
    { value: "", name: "Alle roller" },
    ...ROLES.map((role) => ({ value: role, name: role })),
    { value: NO_ROLE_FILTER, name: "Uten rolle" },
  ];
  const groupItems = [
    { value: "", name: "Alle grupper" },
    ...INSTRUMENT_GROUPS.map((group) => ({ value: group, name: group })),
    { value: NO_PARTS_FILTER, name: "Uten stemmer" },
  ];
  const statusItems = [
    { value: "", name: "Alle statuser" },
    { value: "active", name: "Aktive" },
    { value: "inactive", name: "Inaktive" },
  ];

  let users = $state<User[]>([]);
  let loading = $state(true);
  // Kept apart from an empty list: a list that came back empty and one that
  // never came back read the same on screen otherwise, and only one of them
  // means there are no users.
  let loadFailed = $state(false);

  // The search, all three filters and the sort run client-side — the endpoint
  // returns every user in one call and takes no query options — but each lives
  // in the URL, so opening a user and coming back lands on the same view (see
  // `usersListQuery`).
  let searchTerm = $state("");
  let selectedRole = $state("");
  let selectedGroup = $state("");
  let selectedStatus = $state<UserStatusFilter>("");
  /**
   * The parts catalogue keyed by id, which is where both the instrument group
   * and the catalogue rank of a user's stemmer come from — see
   * `applyUsersListView` for why neither can be taken off the user's own parts.
   * An empty map means the catalogue didn't load (or holds no parts), and the
   * group filter is left out of the page entirely rather than silently matching
   * nobody.
   */
  let partsById = $state<ReadonlyMap<string, Part>>(new Map());
  let sort = $state<SortState>(DEFAULT_USER_SORT);

  let view = $derived<UsersListView>({
    searchTerm,
    selectedRole,
    selectedGroup,
    selectedStatus,
    sort,
  });
  let filteredUsers = $derived(applyUsersListView(users, view, partsById));
  let isFiltered = $derived(
    !!searchTerm.trim() ||
      !!selectedRole ||
      !!selectedGroup ||
      !!selectedStatus,
  );
  let hasGroupFilter = $derived(partsById.size > 0);

  /**
   * Why the list is empty, naming every filter that is on — a reader who has
   * narrowed by role, section and status at once needs to know all of them are
   * in play before concluding a member has no account.
   */
  let emptyResultDescription = $derived.by(() => {
    const narrowings: string[] = [];
    const query = searchTerm.trim();
    if (query) narrowings.push(`som matcher «${query}»`);
    if (selectedRole)
      narrowings.push(
        selectedRole === NO_ROLE_FILTER
          ? "uten noen rolle"
          : `med rollen ${selectedRole}`,
      );
    if (selectedGroup)
      narrowings.push(
        selectedGroup === NO_PARTS_FILTER
          ? "uten stemmer"
          : `i gruppen ${selectedGroup}`,
      );
    if (selectedStatus)
      narrowings.push(
        selectedStatus === "active" ? "som er aktive" : "som er inaktive",
      );
    return `Fant ingen brukere ${joinNorwegian(narrowings)}. Prøv å justere søket eller filtrene.`;
  });

  /** `a`, `b` og `c` — the phrases read out as Norwegian prose. */
  function joinNorwegian(phrases: string[]): string {
    if (phrases.length < 2) return phrases.join("");
    return `${phrases.slice(0, -1).join(", ")} og ${phrases[phrases.length - 1]}`;
  }

  /**
   * The current view as a query string, handed to the editor so its way back
   * returns here rather than to the unfiltered list.
   */
  let listQuery = $derived(usersListQueryParams(view).join("&"));

  /** Mirror the view into the URL, replacing the entry rather than stacking one. */
  function syncUrl() {
    replaceListUrl(usersListQueryParams(view), "/users");
  }

  function openUser(userId: string) {
    const query = listQuery;
    goto(
      `/user/edit/${userId}${query ? `?from=${encodeURIComponent(query)}` : ""}`,
    );
  }

  function selectRole(role: string) {
    selectedRole = role;
    syncUrl();
  }

  function selectGroup(group: string) {
    selectedGroup = group;
    syncUrl();
  }

  // The `select` hands over a plain string, so the status is narrowed back to
  // the three values the filter has — the same check the URL goes through.
  function selectStatus(status: string) {
    selectedStatus = toUserStatusFilter(status);
    syncUrl();
  }

  function clearFilters() {
    searchTerm = "";
    selectedRole = "";
    selectedGroup = "";
    selectedStatus = "";
    syncUrl();
  }

  function changeSort(field: string) {
    sort = toggleSort(sort, field);
    syncUrl();
  }

  // Create-only modal. Editing (profile, status, roles, delete) lives on the
  // dedicated /user/edit/[id] page, reached by clicking a row.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let form = $state<UserForm>(emptyForm());
  let errorMessage = $state("");
  let rejectedPasswordRules = $state<PasswordRuleKey[]>([]);

  // The password has to clear the API's policy before Lagre unlocks — the
  // checklist under the field says which rule is still outstanding, so the
  // disabled button is never a mystery.
  let canSave = $derived(
    !!form.name.trim() &&
      !!form.email.trim() &&
      isPasswordAcceptable(form.password, passwordPolicy.requirements),
  );

  function emptyForm(): UserForm {
    return { name: "", email: "", password: "", active: true, roles: [] };
  }

  /**
   * The sections a user sits in, for the chip list. The column shows these
   * rather than the individual stemmer: a section is what decides which notes a
   * member is shown, it is what the filter above narrows by, and six values read
   * at a glance where thirty part names did not. The stemmer themselves are on
   * the user's own page.
   */
  function groupNames(user: User): string[] {
    return userInstrumentGroups(user, partsById);
  }

  async function loadUsers() {
    loading = true;
    const loaded = await usersApi.list();
    loadFailed = loaded === null;
    users = loaded ?? [];
    loading = false;
  }

  /**
   * The parts catalogue, keyed the way the group filter and the Gruppe column
   * need it. A failure just leaves the page without that filter rather than
   * breaking the list, so it is fetched on its own and never awaited alongside
   * the users.
   */
  async function loadPartCatalogue() {
    const catalogue = await partsApi.list().catch(() => null);
    partsById = new Map(
      (catalogue ?? [])
        .filter((part) => !!part.id)
        .map((part) => [part.id!, part]),
    );
    // A group the URL asked for is unusable without the catalogue behind it, so
    // drop it and say so in the URL rather than showing an empty list.
    if (!partsById.size && selectedGroup) {
      selectedGroup = "";
      syncUrl();
    }
  }

  onMount(async () => {
    // The URL is read before the fetch, so the list paints already filtered
    // rather than showing every user for a frame first.
    const restored = readUsersListQuery(page.url.searchParams);
    searchTerm = restored.searchTerm;
    selectedRole = restored.selectedRole;
    selectedGroup = restored.selectedGroup;
    selectedStatus = restored.selectedStatus;
    sort = restored.sort;
    void loadPartCatalogue();
    await loadUsers();
  });

  function openCreate() {
    form = emptyForm();
    errorMessage = "";
    rejectedPasswordRules = [];
    isOpen = true;
  }

  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";
    rejectedPasswordRules = [];
    const email = form.email.trim();
    const response = await usersApi.create({
      name: form.name.trim(),
      email,
      password: form.password,
    });
    isSaving = false;
    if (response.ok) {
      isOpen = false;
      await loadUsers();

      // The endpoint returns no body, so the new user's id isn't known until
      // we find it in the refreshed list — matched by the email we just sent.
      const created = users.find(
        (user) => (user.email ?? "").toLowerCase() === email.toLowerCase(),
      );
      if (created) openUser(created.id);
      return;
    }

    // A password the API refuses despite passing our checklist means its policy
    // is ahead of the one we loaded — take the copy it sends back, so the rows
    // it named turn red and the checklist starts judging by the real rules.
    const rejection = await readPasswordRejection(response);
    passwordPolicy.applyFromRejection(rejection?.requirements ?? null);
    rejectedPasswordRules = rejection?.failedRules ?? [];
    errorMessage = rejectedPasswordRules.length
      ? "Passordet oppfyller ikke kravene."
      : "Kunne ikke lagre brukeren. Prøv igjen.";
  }
</script>

{#snippet statusBadge(user: User)}
  {#if user.inactive}
    <Badge variant="neutral" dot>Inaktiv</Badge>
  {:else}
    <Badge variant="success" dot>Aktiv</Badge>
  {/if}
{/snippet}

<!-- A sign-in that never happened is worth saying in words: the dash the date
     helpers fall back to reads as missing data rather than as an account nobody
     has used yet, which is the thing an admin is looking for here. -->
{#snippet lastLogin(user: User)}
  {#if user.lastLoginAt}
    <span class="sbb-mono last-login">{formatDateTime(user.lastLoginAt)}</span>
  {:else}
    <span class="last-login none">Aldri</span>
  {/if}
{/snippet}

{#snippet metaLine(label: string, values: string[])}
  {#if values.length}
    <div class="meta card-meta">{label}: {values.join(" · ")}</div>
  {/if}
{/snippet}

{#snippet chipList(labels: string[] | null | undefined)}
  {#if labels && labels.length}
    <div class="chips">
      {#each labels as label}
        <span class="chip">{label}</span>
      {/each}
    </div>
  {:else}
    <span class="chip none">—</span>
  {/if}
{/snippet}

<div class="sbb-list-head">
  <h1 class="sbb-h1">Brukere</h1>
  <Button class="create-btn" onclick={openCreate}>
    <Plus size={17} /> Legg til bruker
  </Button>
</div>

<!--
  Each filter is a single dropdown with no visible label: its "no filter" option
  names what it narrows ("Alle roller"), and every other option is a role, a
  section or a status that reads for itself. The name still reaches a screen
  reader through `aria-label`, which has nothing to read off otherwise.
-->
{#snippet filterField(
  label: string,
  options: { value: string; name: string }[],
  selected: string,
  onselect: (value: string) => void,
)}
  <!-- One-way `value` with an explicit handler rather than `bind:value`: the
       spread that carries `onchange` onto the `select` is applied before
       Flowbite's own binding, so a bound value would still be the previous one
       by the time the handler runs. -->
  <Select
    class="filter-select"
    aria-label={label}
    placeholder=""
    items={options}
    value={selected}
    onchange={(event) =>
      onselect((event.currentTarget as HTMLSelectElement).value)}
  />
{/snippet}

<div class="list-controls">
  <div class="search-cell">
    <SearchInput
      placeholder="Søk i brukere…"
      bind:value={searchTerm}
      oninput={syncUrl}
    />
  </div>
  <div class="filter-bar">
    {@render filterField("Rolle", roleItems, selectedRole, selectRole)}
    {#if hasGroupFilter}
      {@render filterField("Gruppe", groupItems, selectedGroup, selectGroup)}
    {/if}
    {@render filterField("Status", statusItems, selectedStatus, selectStatus)}
    {#if isFiltered}
      <Button variant="ghost" size="sm" onclick={clearFilters}>Nullstill</Button
      >
    {/if}
  </div>
</div>

{#if loading}
  <LoadingSpinner />
{:else if loadFailed}
  <LoadFailed
    title="Kunne ikke laste brukere"
    description="Noe gikk galt da listen skulle hentes."
    onretry={loadUsers}
  />
{:else if filteredUsers.length === 0}
  {#if isFiltered}
    <EmptyState title="Ingen treff" description={emptyResultDescription}>
      {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Ingen brukere ennå"
      description="Legg til den første brukeren for å gi noen tilgang til notearkivet."
    >
      {#snippet icon()}<UsersRound size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <SortableTableHeader
            field="name"
            label="Bruker"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="role"
            label="Roller"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="group"
            label="Gruppe"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="lastLogin"
            label="Sist innlogget"
            {sort}
            onsort={changeSort}
          />
          <SortableTableHeader
            field="status"
            label="Status"
            {sort}
            onsort={changeSort}
          />
        </tr>
      </thead>
      <tbody>
        {#each filteredUsers as user (user.id)}
          <tr class="clickable" onclick={() => openUser(user.id)}>
            <!-- Name over email in one cell, behind the same avatar the header
                 carries: two chip columns need the width more than the e-mail
                 needs its own. -->
            <td class="c-user">
              <div class="user-cell">
                <UserAvatar
                  name={user.name}
                  userId={user.id}
                  pictureVersion={profilePictureVersion(user)}
                />
                <div class="user-text">
                  <div class="user-name">{user.name}</div>
                  <div class="user-email">{user.email}</div>
                </div>
              </div>
            </td>
            <td class="c-roles">{@render chipList(user.roles)}</td>
            <td class="c-group">{@render chipList(groupNames(user))}</td>
            <td class="c-last-login">{@render lastLogin(user)}</td>
            <td class="c-status">{@render statusBadge(user)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filteredUsers as user (user.id)}
      <div class="sbb-card clickable" onclick={() => openUser(user.id)}>
        <div class="body">
          <!-- The avatar sits with the name and e-mail rather than beside the
               whole card: centred against four lines it would drift away from
               the person it belongs to. -->
          <div class="card-identity">
            <UserAvatar
              name={user.name}
              userId={user.id}
              pictureVersion={profilePictureVersion(user)}
            />
            <div class="user-text">
              <div class="t">{user.name}</div>
              <div class="meta">{user.email}</div>
            </div>
          </div>
          <!-- Roles and sections read as labelled text here rather than chips:
               the card has no column headers, so chips both wrap badly at this
               width and leave the two lists indistinguishable. -->
          {@render metaLine("Roller", user.roles ?? [])}
          {@render metaLine("Gruppe", groupNames(user))}
          {@render metaLine(
            "Sist innlogget",
            user.lastLoginAt ? [formatDateTime(user.lastLoginAt)] : [],
          )}
        </div>
        <div class="acts">{@render statusBadge(user)}</div>
      </div>
    {/each}
  </div>
{/if}

<Modal title="Legg til bruker" bind:open={isOpen} size="md">
  <UserModalBody {form} isEditing={false} {rejectedPasswordRules} />
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
  /* Search and the three filters share one row on a wide screen and stack on a
     narrow one. The search field keeps the space left over, so the filters stay
     the width their longest option needs. */
  .list-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .search-cell {
    flex: 1 1 260px;
  }
  /* `SearchInput` carries its own bottom margin for the pages that stack it. */
  .search-cell :global(.search) {
    margin-bottom: 0;
  }
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  /* Flowbite wraps each `select` in a full-width div, which would put every
     filter on a line of its own. Sized to its longest option instead, with a
     floor so the narrowest one still reads as a control. */
  .filter-bar :global(.filter-select) {
    flex: 0 0 auto;
    width: auto;
  }
  .filter-bar :global(.filter-select select) {
    min-width: 9.5rem;
  }

  .c-user {
    width: 28%;
  }
  /* The avatar and the name/e-mail pair, in the table row and in the card. */
  .user-cell,
  .card-identity {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  /* Lets a long e-mail wrap rather than widen the column it sits in. */
  .user-text {
    min-width: 0;
  }
  .user-name {
    font-weight: 500;
  }
  .user-email {
    margin-top: 2px;
    font-size: 12.5px;
    color: var(--text-secondary);
  }
  .c-roles {
    width: 22%;
  }
  .c-group {
    width: 18%;
  }
  .c-last-login {
    width: 170px;
  }
  .last-login {
    font-size: 12.5px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .last-login.none {
    color: var(--text-muted);
  }
  .c-status {
    width: 130px;
  }

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
  .chip.none {
    padding-left: 0;
    color: var(--text-muted);
    background: transparent;
    border-color: transparent;
  }
  .card-meta {
    color: var(--text-muted);
  }

  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }
</style>
