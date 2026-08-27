<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Modal, Checkbox } from "flowbite-svelte";
  import {
    Trash2,
    Check,
    UserX,
    UserCheck,
    X,
    Plus,
    Music,
  } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import { parts as partsApi } from "$lib/api/parts";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import { ROLES, holdsRole, type Role } from "$lib/roles";
  import { formatDateTime } from "$lib/utils/date";
  import { byCatalogOrder } from "$lib/utils/partOrder";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import { usersListHref } from "$lib/utils/usersListQuery";
  import type {
    Part,
    SaveState,
    UpdateUserRequest,
    User,
    UserForm,
  } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    SaveIndicator,
    UserAvatar,
    SAVED_VISIBLE_MS,
  } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import ProfilePicturePanel from "$lib/components/ProfilePicturePanel.svelte";
  import PartPickerModalBody from "$lib/components/PartPickerModalBody.svelte";
  import PageLoader from "$lib/components/PageLoader.svelte";

  // Typed on `Role`, so adding a role to the backend list won't compile until it
  // is described here too.
  const ROLE_DESCRIPTIONS: Record<Role, string> = {
    Musikant: "Kan se og laste ned noter på aktive prosjekt.",
    Arkivleser:
      "Kan se og laste ned noter i hele arkivet, også gamle prosjekt.",
    Prosjektleder:
      "Kan opprette og redigere prosjekter, og legge til noter i dem.",
    Noteansvarlig: "Kan redigere arkiv, stemmer, prosjekter og kategorier.",
    Admin: "Full tilgang — kan også administrere brukere.",
  };

  let id = $derived(page.params.id!);

  let user = $state<User | null>(null);
  /**
   * Where every way out of this page goes. The list hands its search, filters
   * and sort along in `from`, so the reader comes back to the view they left
   * rather than to the unfiltered list of users.
   */
  let listHref = $derived(usersListHref(page.url.searchParams.get("from")));

  let loading = $state(true);
  let notFound = $state(false);

  // Profil section (name/email/password, saved together via PUT).
  let profileForm = $state<UserForm>({
    name: "",
    email: "",
    password: "",
    active: true,
    roles: [],
  });
  let savingProfile = $state(false);
  let profileError = $state("");
  let profileSaved = $state(false);
  let profileSavedTimer: ReturnType<typeof setTimeout> | undefined;
  let rejectedPasswordRules = $state<PasswordRuleKey[]>([]);

  // Status + roles are immediate actions against their own endpoints.
  let savingStatus = $state(false);
  let statusError = $state("");
  // Brief confirmation after a status change lands (activate/deactivate).
  let statusSaved = $state("");
  let statusSavedTimer: ReturnType<typeof setTimeout> | undefined;
  // The role currently being written, and the one that just landed — together
  // they drive each row's save indicator.
  let savingRole = $state<Role | null>(null);
  let savedRole = $state<Role | null>(null);
  let savedRoleTimer: ReturnType<typeof setTimeout> | undefined;
  let roleError = $state("");

  // Stemmer — which parts the user plays. The catalogue feeds the picker dialog;
  // what the user already plays rides along on the user itself.
  let catalogParts = $state<Part[]>([]);
  let catalogFailed = $state(false);
  let pickerOpen = $state(false);
  // Ids ticked in the picker, held here so the dialog's footer can count them.
  let pickerSelection = $state<string[]>([]);
  let partsSaveState = $state<SaveState>("idle");
  let partsSavedTimer: ReturnType<typeof setTimeout> | undefined;
  let partsError = $state("");

  // Delete confirmation.
  let confirmOpen = $state(false);
  let hardDelete = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state("");

  // A blank password field keeps the current one, so the policy only has a say
  // once something has been typed into it.
  let canSaveProfile = $derived(
    !!profileForm.name.trim() &&
      !!profileForm.email.trim() &&
      (!profileForm.password ||
        isPasswordAcceptable(
          profileForm.password,
          passwordPolicy.requirements,
        )),
  );

  let assignedParts = $derived(user?.parts ?? []);
  let pictureVersion = $derived(profilePictureVersion(user));

  /**
   * What the picker offers: the catalogue minus what the user already plays, and
   * minus the parts not worth assigning to anyone. A part with no instrument group
   * or with indexing turned off is a one-off or a leftover rather than a seat
   * somebody sits in, so only the ordinary grouped parts are on offer.
   *
   * This limits what can be *added* only. A part already assigned stays listed and
   * removable whether or not it would qualify today, and `writeParts` keeps
   * sending it — the endpoint replaces the whole assignment, so anything filtered
   * out here would otherwise be silently dropped on the next save.
   */
  let availableParts = $derived.by(() => {
    const assignedIds = new Set(assignedParts.map((part) => part.id));
    return catalogParts.filter(
      (part) =>
        !assignedIds.has(part.id) && !!part.indexable && !!part.instrumentGroup,
    );
  });

  onMount(load);
  onDestroy(() => {
    clearTimeout(profileSavedTimer);
    clearTimeout(savedRoleTimer);
    clearTimeout(statusSavedTimer);
    clearTimeout(partsSavedTimer);
  });

  /**
   * Just the parts catalogue, which the picker's own retry needs: only that panel
   * depends on it, and re-running `load` to recover it would refetch the user and
   * take any unsaved profile edits down with it.
   */
  async function loadPartsCatalog() {
    const catalog = await partsApi.list().catch(() => undefined);
    catalogParts = catalog ?? [];
    catalogFailed = catalog === undefined;
  }

  async function load() {
    loading = true;
    // The user carries their own fields, roles and assigned parts; the parts
    // catalogue is fetched alongside for the picker, and only that panel is
    // affected if it doesn't arrive. Both still go out at once — the catalogue
    // just runs through the helper above so the retry shares it.
    const [response] = await Promise.all([
      usersApi.get(id).catch(() => null),
      loadPartsCatalog(),
    ]);
    // The API reports errors as a problem-details body, which the client parses
    // as happily as a real user, so trust the response only if it looks like one.
    const found = response?.id ? response : null;
    user = found;
    notFound = !found;
    if (found) {
      profileForm = {
        name: found.name ?? "",
        email: found.email ?? "",
        password: "",
        active: !found.inactive,
        roles: [...(found.roles ?? [])],
      };
    }
    loading = false;
  }

  async function saveProfile() {
    if (!canSaveProfile || !user) return;
    savingProfile = true;
    profileError = "";
    rejectedPasswordRules = [];
    const body: UpdateUserRequest = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    };
    // Same emptiness test as `canSaveProfile`, so the field never looks accepted
    // while being quietly dropped from the request.
    if (profileForm.password) body.password = profileForm.password;
    const response = await usersApi.update(user.id, body);
    savingProfile = false;
    if (response.ok) {
      user = { ...user, name: body.name ?? null, email: body.email ?? null };
      profileForm.password = "";
      profileSaved = true;
      clearTimeout(profileSavedTimer);
      profileSavedTimer = setTimeout(
        () => (profileSaved = false),
        SAVED_VISIBLE_MS,
      );
      return;
    }

    // Only a password can be refused on policy grounds; anything else here is a
    // plain failure. Adopting the policy the rejection carries keeps the
    // checklist honest if the server's rules moved since the page loaded.
    const rejection = await readPasswordRejection(response);
    passwordPolicy.applyFromRejection(rejection?.requirements ?? null);
    rejectedPasswordRules = rejection?.failedRules ?? [];
    profileError = rejectedPasswordRules.length
      ? "Passordet oppfyller ikke kravene."
      : "Kunne ikke lagre endringene. Prøv igjen.";
  }

  async function toggleStatus() {
    if (!user) return;
    savingStatus = true;
    statusError = "";
    statusSaved = "";
    clearTimeout(statusSavedTimer);
    const activate = user.inactive;
    const response = activate
      ? await usersApi.activate(user.id)
      : await usersApi.deactivate(user.id);
    savingStatus = false;
    if (response.ok) {
      user = { ...user, inactive: !activate };
      statusSaved = activate
        ? "Brukeren er aktivert."
        : "Brukeren er deaktivert.";
      statusSavedTimer = setTimeout(() => (statusSaved = ""), SAVED_VISIBLE_MS);
    } else {
      statusError = "Kunne ikke endre status. Prøv igjen.";
    }
  }

  function hasRole(role: Role): boolean {
    return holdsRole(user?.roles ?? [], role);
  }

  /** Progress for one role's row — each row writes with no Lagre button. */
  function roleSaveState(role: Role): SaveState {
    if (savingRole === role) return "saving";
    if (savedRole === role) return "saved";
    return "idle";
  }

  /**
   * Grant or revoke one role, leaving the others alone — roles are independent
   * grants that combine, so each row writes only itself. The list updates
   * optimistically for an instant response; on failure the roles are re-read
   * from the server so the picker can't drift from the real state.
   */
  async function toggleRole(role: Role) {
    if (!user || savingRole !== null) return;

    const userId = user.id;
    const previous = user.roles ?? [];
    const held = hasRole(role);

    clearTimeout(savedRoleTimer);
    savedRole = null;
    savingRole = role;
    roleError = "";
    user = {
      ...user,
      roles: held
        ? previous.filter(
            (assigned) => assigned.toLowerCase() !== role.toLowerCase(),
          )
        : [...previous, role],
    };

    const response = await (
      held
        ? usersApi.removeRole(userId, role)
        : usersApi.assignRole(userId, role)
    ).catch(() => null);

    savingRole = null;
    if (response?.ok) {
      savedRole = role;
      savedRoleTimer = setTimeout(() => (savedRole = null), SAVED_VISIBLE_MS);
      return;
    }

    const fresh = await usersApi.get(userId).catch(() => null);
    const roles = fresh?.id ? (fresh.roles ?? []) : previous;
    if (user) user = { ...user, roles };
    roleError = held
      ? "Kunne ikke fjerne rollen. Prøv igjen."
      : "Kunne ikke gi rollen. Prøv igjen.";
  }

  /**
   * Save a new list of parts. The endpoint replaces the whole assignment rather
   * than adding or removing one, so every write sends the full list. The UI moves
   * first for an instant response; because a rejected write leaves the previous
   * assignment standing on the server, failure re-reads the parts instead of
   * leaving the optimistic list on screen.
   */
  async function writeParts(next: Part[]) {
    if (!user || partsSaveState === "saving") return;

    const userId = user.id;
    const previous = assignedParts;
    clearTimeout(partsSavedTimer);
    partsSaveState = "saving";
    partsError = "";
    user = { ...user, parts: next };

    const response = await usersApi
      .assignParts(
        userId,
        next.map((part) => part.id!),
      )
      .catch(() => null);

    if (response?.ok) {
      partsSaveState = "saved";
      partsSavedTimer = setTimeout(
        () => (partsSaveState = "idle"),
        SAVED_VISIBLE_MS,
      );
      return;
    }

    const fresh = await usersApi.get(userId).catch(() => null);
    const parts = fresh?.id ? (fresh.parts ?? []) : previous;
    if (user) user = { ...user, parts };
    partsSaveState = "idle";
    partsError = "Kunne ikke lagre stemmene. Prøv igjen.";
  }

  function openPicker() {
    pickerSelection = [];
    partsError = "";
    pickerOpen = true;
  }

  /**
   * Assigns everything ticked in the dialog, in one write — the endpoint replaces
   * the whole assignment anyway, so adding several at once costs no more than
   * adding one.
   */
  function addPickedParts() {
    const picked = catalogParts.filter((part) =>
      pickerSelection.includes(part.id!),
    );
    pickerOpen = false;
    if (!picked.length) return;
    writeParts([...assignedParts, ...picked].sort(byCatalogOrder));
  }

  function removePart(partId: string) {
    writeParts(assignedParts.filter((part) => part.id !== partId));
  }

  function askDelete() {
    deleteError = "";
    hardDelete = false;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!user) return;
    isDeleting = true;
    deleteError = "";
    const response = await usersApi.remove(user.id, hardDelete);
    isDeleting = false;
    if (response.ok) goto(listHref);
    else deleteError = "Kunne ikke slette brukeren. Prøv igjen.";
  }
</script>

<Breadcrumb
  class="mb-4"
  items={[{ label: "Brukere", href: listHref }, { label: user?.name ?? "-" }]}
/>

{#if loading}
  <PageLoader label="Laster bruker…" />
{:else if notFound || !user}
  <div class="notfound">
    <h1 class="sbb-h1">Fant ikke brukeren</h1>
    <p>Brukeren finnes ikke, eller er allerede slettet.</p>
    <Button onclick={() => goto(listHref)}>Til brukere</Button>
  </div>
{:else}
  <div class="head">
    <!-- The avatar belongs to the page heading, at the one size on the page big
         enough to read as a portrait: this is where the page says who is being
         edited, and every panel below it is a detail of that person. -->
    <div class="identity">
      <UserAvatar
        name={user.name}
        userId={user.id}
        {pictureVersion}
        size={72}
      />
      <div class="title-cell">
        <h1 class="sbb-h1 title">{user.name}</h1>
        <p class="email">{user.email}</p>
      </div>
    </div>
    {#if user.inactive}
      <Badge variant="neutral" dot>Inaktiv</Badge>
    {:else}
      <Badge variant="success" dot>Aktiv</Badge>
    {/if}
  </div>

  <!--
    Two columns on a wide screen, one below it. The split is by weight rather
    than by kind: Profil and Roller are the tall panels, so the three short ones
    ride together on the right instead of trailing a long scroll.
  -->
  <div class="panels">
    <div class="column">
      <!-- Profil -->
      <section class="panel">
        <h2 class="sbb-h3">Profil</h2>
        <UserModalBody form={profileForm} isEditing {rejectedPasswordRules} />
        {#if profileError}<p class="err">{profileError}</p>{/if}
        <div class="panel-foot">
          {#if profileSaved}
            <span class="saved"><Check size={15} /> Lagret</span>
          {/if}
          <Button
            loading={savingProfile}
            disabled={!canSaveProfile}
            onclick={saveProfile}
          >
            Lagre endringer
          </Button>
        </div>
      </section>

      <!-- Roller -->
      <section class="panel">
        <h2 class="sbb-h3">Roller</h2>
        <p class="hint">
          Velg rollene brukeren skal ha. En bruker kan ha flere roller, og
          rettighetene legges sammen. Endringer lagres med én gang.
        </p>
        <div class="roles" role="group" aria-label="Roller">
          {#each ROLES as role (role)}
            <button
              type="button"
              class="role-option"
              class:selected={hasRole(role)}
              role="checkbox"
              aria-checked={hasRole(role)}
              disabled={savingRole !== null}
              onclick={() => toggleRole(role)}
            >
              <span class="checkbox" aria-hidden="true">
                {#if hasRole(role)}<Check size={13} strokeWidth={3} />{/if}
              </span>
              <span class="role">
                <span class="role__name">{role}</span>
                <span class="role__desc">{ROLE_DESCRIPTIONS[role]}</span>
              </span>
              <SaveIndicator state={roleSaveState(role)} />
            </button>
          {/each}
        </div>
        {#if roleError}<p class="err">{roleError}</p>{/if}
      </section>
    </div>

    <div class="column">
      <!-- Profilbilde. It rides with the short panels rather than under Profil,
           which is already the tallest thing on the page — the split here is by
           weight, not by kind. -->
      <ProfilePicturePanel
        userId={user.id}
        name={user.name}
        {pictureVersion}
        onchange={(version) => {
          if (user)
            user = {
              ...user,
              profilePicture: version ? { version } : null,
            };
        }}
      />

      <!-- Stemmer -->
      <section class="panel">
        <div class="panel-head parts-head">
          <h2 class="sbb-h3">Stemmer</h2>
          <div class="head-actions">
            <SaveIndicator state={partsSaveState} />
            <Button
              size="sm"
              onclick={openPicker}
              disabled={catalogFailed ||
                partsSaveState === "saving" ||
                availableParts.length === 0}
              title={availableParts.length === 0
                ? "Det er ingen flere stemmer å legge til"
                : undefined}
            >
              <Plus size={15} /> Legg til stemmer
            </Button>
          </div>
        </div>

        {#if catalogFailed}
          <p class="err">
            Kunne ikke laste stemmekatalogen, så stemmer kan ikke legges til nå.
            <button type="button" class="retry" onclick={loadPartsCatalog}>
              Prøv igjen
            </button>
          </p>
        {/if}
        {#if partsError}<p class="err">{partsError}</p>{/if}

        {#if assignedParts.length === 0}
          <div class="part-empty">
            <span class="part-empty__icon"><Music size={20} /></span>
            <p class="part-empty__title">Ingen stemmer lagt til</p>
            <p class="part-empty__desc">
              Legg til stemmene brukeren spiller, så vet vi hvilke noter som er
              deres.
            </p>
          </div>
        {:else}
          <ul class="part-list">
            {#each assignedParts as part (part.id)}
              <li class="part-row">
                <span class="part-row__name">{part.name}</span>
                {#if part.instrumentGroup}
                  <span class="part-row__group">{part.instrumentGroup}</span>
                {/if}
                <button
                  type="button"
                  class="part-row__remove"
                  onclick={() => removePart(part.id!)}
                  disabled={partsSaveState === "saving"}
                  aria-label={`Fjern ${part.name}`}
                >
                  <X size={16} />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <!-- Status -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="sbb-h3">Status</h2>
            <p class="hint">
              Inaktive brukere beholdes, men kan ikke logge inn før de aktiveres
              igjen.
            </p>
          </div>
        </div>
        <!-- Sits with the status because it answers the question the status
             raises: whether the account is in use at all is what decides
             whether deactivating it costs anyone anything. -->
        <p class="last-login">
          Sist innlogget: <span class="last-login__value">
            {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "aldri"}
          </span>
        </p>
        {#if statusError}<p class="err">{statusError}</p>{/if}
        <div class="status-row">
          <Button
            variant={user.inactive ? "primary" : "secondary"}
            loading={savingStatus}
            onclick={toggleStatus}
          >
            {#if user.inactive}
              <UserCheck size={16} /> Aktiver bruker
            {:else}
              <UserX size={16} /> Deaktiver bruker
            {/if}
          </Button>
          {#if statusSaved}
            <span class="saved"><Check size={15} /> {statusSaved}</span>
          {/if}
        </div>
      </section>

      <!-- Faresone -->
      <section class="panel danger">
        <h2 class="sbb-h3">Faresone</h2>
        <p class="hint">
          Slett brukeren fra systemet. Uten permanent sletting deaktiveres
          brukeren og kan gjenopprettes senere.
        </p>
        <Button variant="danger" onclick={askDelete}>
          <Trash2 size={16} /> Slett bruker
        </Button>
      </section>
    </div>
  </div>
{/if}

<Modal title="Legg til stemmer" bind:open={pickerOpen} size="md">
  <PartPickerModalBody
    parts={availableParts}
    bind:selectedIds={pickerSelection}
  />
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (pickerOpen = false)}>Avbryt</Button>
    <Button disabled={pickerSelection.length === 0} onclick={addPickedParts}>
      <Check size={16} />
      Legg til{pickerSelection.length ? ` (${pickerSelection.length})` : ""}
    </Button>
  {/snippet}
</Modal>

<Modal bind:open={confirmOpen} size="xs">
  <div class="confirm-body">
    <span class="danger-ico"><Trash2 size={22} /></span>
    <h3>Slette bruker?</h3>
    <p>«{user?.name}» fjernes.</p>
    <div class="hard">
      <Checkbox bind:checked={hardDelete}>
        Slett permanent (kan ikke angres). Uten dette deaktiveres brukeren og
        kan gjenopprettes senere.
      </Checkbox>
    </div>
    {#if deleteError}<p class="err">{deleteError}</p>{/if}
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (confirmOpen = false)}>Avbryt</Button
    >
    <Button variant="danger" loading={isDeleting} onclick={confirmDelete}>
      <Trash2 size={16} />
      {hardDelete ? "Slett permanent" : "Slett"}
    </Button>
  {/snippet}
</Modal>

<style>
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  /* The avatar centres on the name and e-mail together rather than on the
     heading alone, so the disc reads as belonging to the pair. */
  .identity {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
  }
  .title {
    margin: 0;
    font-size: 40px;
  }
  .email {
    margin: 6px 0 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  /*
   * Each column stacks its own panels, so the panels themselves carry no outer
   * spacing or width — the grid decides both.
   */
  .panels {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    align-items: start;
  }
  .column {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }
  @media (max-width: 1024px) {
    .panels {
      grid-template-columns: minmax(0, 1fr);
      max-width: 640px;
    }
  }

  .panel {
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
  .panel h2 {
    margin: 0 0 16px;
    font-size: 20px;
  }
  .panel.danger {
    border-color: color-mix(in srgb, var(--danger) 40%, var(--border-subtle));
  }
  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .panel-head h2 {
    margin: 0 0 4px;
  }
  /* No subtitle under this one's heading, so the title and its action sit on a
     shared centre line instead of hanging from the top. */
  .panel-head.parts-head {
    align-items: center;
  }
  .panel-head.parts-head h2 {
    margin: 0;
  }
  .head-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .panel-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    margin-top: 20px;
  }
  .saved {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--success);
  }
  .status-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .last-login {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .last-login__value {
    color: var(--text-secondary);
  }
  .hint {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0 0 16px;
  }
  .err {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--danger);
  }

  /* Assigned parts — one row each, remove action trailing on the right. */
  .part-list {
    list-style: none;
    margin: 22px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .part-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 12px 14px 18px;
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
  }
  .part-row__name {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Pushed to the right so the remove buttons line up whatever the name's
     length, with the group reading as a trailing note on the name. */
  .part-row__group {
    margin-right: auto;
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .part-row__name:last-of-type {
    margin-right: auto;
  }
  .part-row__remove {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color var(--dur-fast),
      background var(--dur-fast);
  }
  .part-row__remove:hover:not(:disabled) {
    color: var(--danger);
    background: var(--danger-soft);
  }
  .part-row__remove:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Compact zero-state — `ui/EmptyState` is built for a whole page and its 56px
     of padding would dwarf a panel this size. */
  .part-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
    margin-top: 22px;
    padding: 32px 24px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-md);
  }
  .part-empty__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-bottom: 2px;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
  }
  .part-empty__title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 15px;
    color: var(--text-primary);
  }
  .part-empty__desc {
    margin: 0;
    max-width: 320px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* Role picker — multi-select, one option per role. */
  .roles {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .role-option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    font-family: var(--font-text);
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .role-option:hover:not(:disabled) {
    border-color: var(--border-strong);
  }
  .role-option.selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .role-option:disabled {
    cursor: default;
  }
  /* Checkbox — filled with the accent while the role is held. */
  .checkbox {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--border-strong);
    color: var(--accent-on);
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .role-option.selected .checkbox {
    border-color: var(--accent);
    background: var(--accent);
  }
  .role {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .role__name {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
  }
  .role__desc {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .notfound {
    text-align: center;
    padding: 60px 24px;
  }
  .notfound p {
    margin: 10px 0 20px;
    color: var(--text-secondary);
  }

  /* Delete confirmation. */
  .confirm-body {
    text-align: center;
  }
  .danger-ico {
    width: 46px;
    height: 46px;
    border-radius: 999px;
    background: var(--danger-soft);
    color: var(--danger);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .confirm-body h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    margin: 0 0 8px;
  }
  .confirm-body p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.55;
  }
  .confirm-body .hard {
    text-align: left;
    margin-top: 18px;
  }
  .confirm-body .hard :global(label) {
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  @media (max-width: 720px) {
    .title {
      font-size: 30px;
    }
  }
  /* Reads as the link it behaves like, and inherits the message's own size so it
     sits in the sentence rather than beside it. */
  .retry {
    padding: 0;
    font: inherit;
    color: var(--text-primary);
    background: transparent;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .retry:hover {
    color: var(--brass-400);
  }
</style>
