<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Modal, Checkbox } from "flowbite-svelte";
  import { Trash2, Check, UserX, UserCheck } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import { ROLES, type Role } from "$lib/roles";
  import type {
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
    SAVED_VISIBLE_MS,
  } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  // Typed on `Role`, so adding a role to the backend list won't compile until it
  // is described here too.
  const ROLE_DESCRIPTIONS: Record<Role, string> = {
    Musikant: "Kan se og laste ned noter.",
    Noteansvarlig:
      "Kan i tillegg redigere arkiv, stemmer, prosjekter og kategorier.",
    Admin: "Full tilgang — kan også administrere brukere.",
  };

  let id = $derived(page.params.id!);

  let user = $state<User | null>(null);
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

  // Roles are a single escalating tier (Musikant < Noteansvarlig < Admin) — a
  // higher role already grants the lower capabilities, so a user holds exactly
  // one. The picker reflects the highest role currently held (null if none).
  let selectedRole = $derived.by<Role | null>(() => {
    for (let index = ROLES.length - 1; index >= 0; index--) {
      if (hasRole(ROLES[index])) return ROLES[index];
    }
    return null;
  });

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

  onMount(load);
  onDestroy(() => {
    clearTimeout(profileSavedTimer);
    clearTimeout(savedRoleTimer);
    clearTimeout(statusSavedTimer);
  });

  async function load() {
    loading = true;
    // The single-user endpoint is the only one that answers with the user's
    // roles — the list leaves them out — so the roles panel depends on it.
    const response = await usersApi.get(id).catch(() => null);
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
    return (user?.roles ?? []).some(
      (assigned) => assigned.toLowerCase() === role.toLowerCase(),
    );
  }

  /** Progress for one role's row — the switch writes with no Lagre button. */
  function roleSaveState(role: Role): SaveState {
    if (savingRole === role) return "saving";
    if (savedRole === role) return "saved";
    return "idle";
  }

  /**
   * Select a single access tier: assign the chosen role and drop every other
   * one, so the user always ends up holding exactly it. The list updates
   * optimistically for an instant response; on any failure the roles are
   * re-read from the server so the picker can't drift from the real state
   * (e.g. the assign landed but a removal didn't).
   */
  async function selectRole(role: Role) {
    if (!user || savingRole !== null) return;
    const previous = user.roles ?? [];
    // Already exactly this role — nothing to change.
    if (
      previous.length === 1 &&
      previous[0].toLowerCase() === role.toLowerCase()
    )
      return;

    const userId = user.id;
    const others = previous.filter(
      (assigned) => assigned.toLowerCase() !== role.toLowerCase(),
    );

    clearTimeout(savedRoleTimer);
    savedRole = null;
    savingRole = role;
    roleError = "";
    user = { ...user, roles: [role] };

    try {
      if (!previous.some((r) => r.toLowerCase() === role.toLowerCase())) {
        const res = await usersApi.assignRole(userId, role);
        if (!res.ok) throw new Error("assign failed");
      }
      // Remove the old tier(s) only after the new one is in place, so the user
      // is never briefly left without the access they should keep.
      for (const other of others) {
        const res = await usersApi.removeRole(userId, other);
        if (!res.ok) throw new Error("remove failed");
      }
      savingRole = null;
      savedRole = role;
      savedRoleTimer = setTimeout(() => (savedRole = null), SAVED_VISIBLE_MS);
    } catch {
      savingRole = null;
      const fresh = await usersApi.get(userId).catch(() => null);
      const roles = fresh?.id ? (fresh.roles ?? []) : previous;
      if (user) user = { ...user, roles };
      roleError = "Kunne ikke endre rollen. Prøv igjen.";
    }
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
    if (response.ok) goto("/users");
    else deleteError = "Kunne ikke slette brukeren. Prøv igjen.";
  }
</script>

<Breadcrumb
  class="mb-4"
  items={[{ label: "Brukere", href: "/users" }, { label: user?.name ?? "-" }]}
/>

{#if loading}
  <LoadingSpinner label="Laster bruker…" />
{:else if notFound || !user}
  <div class="notfound">
    <h1 class="sbb-h1">Fant ikke brukeren</h1>
    <p>Brukeren finnes ikke, eller er allerede slettet.</p>
    <Button onclick={() => goto("/users")}>Til brukere</Button>
  </div>
{:else}
  <div class="head">
    <div class="title-cell">
      <h1 class="sbb-h1 title">{user.name}</h1>
      <p class="email">{user.email}</p>
    </div>
    {#if user.inactive}
      <Badge variant="neutral" dot>Inaktiv</Badge>
    {:else}
      <Badge variant="success" dot>Aktiv</Badge>
    {/if}
  </div>

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

  <!-- Rolle -->
  <section class="panel">
    <h2 class="sbb-h3">Rolle</h2>
    <p class="hint">
      Velg ett tilgangsnivå — et høyere nivå inkluderer alt det lavere kan.
      Endringer lagres med én gang.
    </p>
    <div class="roles" role="radiogroup" aria-label="Tilgangsnivå">
      {#each ROLES as role (role)}
        <button
          type="button"
          class="role-option"
          class:selected={selectedRole === role}
          role="radio"
          aria-checked={selectedRole === role}
          disabled={savingRole !== null}
          onclick={() => selectRole(role)}
        >
          <span class="radio" aria-hidden="true"></span>
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
      Slett brukeren fra systemet. Uten permanent sletting deaktiveres brukeren
      og kan gjenopprettes senere.
    </p>
    <Button variant="danger" onclick={askDelete}>
      <Trash2 size={16} /> Slett bruker
    </Button>
  </section>
{/if}

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
  .title {
    margin: 0;
    font-size: 40px;
  }
  .email {
    margin: 6px 0 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .panel {
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    margin-bottom: 20px;
    max-width: 640px;
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

  /* Access-tier picker — single-select, one option per role. */
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
  /* Radio dot — filled with the accent when its tier is the selected one. */
  .radio {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--border-strong);
    position: relative;
    transition: border-color var(--dur-fast);
  }
  .role-option.selected .radio {
    border-color: var(--accent);
  }
  .role-option.selected .radio::after {
    content: "";
    position: absolute;
    inset: 3px;
    border-radius: 50%;
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
</style>
